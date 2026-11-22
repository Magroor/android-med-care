const GRAPH_VERSION = "v21.0";

export type IncomingWhatsApp = {
  from: string;
  name?: string;
  id: string;
  text: string;
  type: string;
  timestamp?: number;
};

export type StatusUpdate = { id: string; status: string };

type WaPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          button?: { text?: string };
          interactive?: {
            button_reply?: { title?: string };
            list_reply?: { title?: string };
          };
        }>;
        statuses?: Array<{ id?: string; status?: string }>;
      };
    }>;
  }>;
};

/** Parse a WhatsApp Business Cloud API webhook body into messages and delivery statuses. */
export function parseWebhookPayload(body: unknown): { messages: IncomingWhatsApp[]; statuses: StatusUpdate[] } {
  const messages: IncomingWhatsApp[] = [];
  const statuses: StatusUpdate[] = [];
  const payload = body as WaPayload;
  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;
      const names = new Map<string, string>();
      for (const c of value.contacts ?? []) {
        if (c.wa_id && c.profile?.name) names.set(c.wa_id, c.profile.name);
      }
      for (const m of value.messages ?? []) {
        if (!m.from || !m.id) continue;
        const type = m.type ?? "unknown";
        let text = "";
        if (type === "text") text = m.text?.body ?? "";
        else if (type === "button") text = m.button?.text ?? "";
        else if (type === "interactive") {
          text = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
        }
        messages.push({
          from: m.from,
          id: m.id,
          name: names.get(m.from),
          text: text.trim(),
          type,
          timestamp: m.timestamp ? Number(m.timestamp) : undefined,
        });
      }
      for (const st of value.statuses ?? []) {
        if (st.id && st.status) statuses.push({ id: st.id, status: st.status });
      }
    }
  }
  return { messages, statuses };
}

export type SendResult =
  | { ok: true; id?: string; simulated?: boolean }
  | { ok: false; retryable: boolean; error: string };

export type Creds = { phoneNumberId: string; accessToken: string };

const GRAPH_BASE = () => process.env.WHATSAPP_GRAPH_URL ?? "https://graph.facebook.com";

/** WhatsApp lets you send free-form text only within 24h of the patient's last message. */
export const WINDOW_MS = 24 * 3600_000;
const WINDOW_MARGIN_MS = 10 * 60_000; // treat the window as closed 10 min early

export function isWithinWindow(lastInboundAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!lastInboundAt) return false;
  return now.getTime() - lastInboundAt.getTime() < WINDOW_MS - WINDOW_MARGIN_MS;
}

export type SendPlan =
  | { mode: "text" }
  | { mode: "template"; name: string; language: string }
  | { mode: "skip"; reason: string }
  | { mode: "fail"; error: string };

/** Decide how to send: plain text (inside the window), approved template (outside), or fail fast. */
export function planSend(opts: {
  connected: boolean;
  inWindow: boolean;
  templateKey: string | null;
  templateName: string;
  templateLanguage: string;
  /** paid templates enabled? (false = free-first: skip instead of sending a template) */
  allowTemplates: boolean;
}): SendPlan {
  if (!opts.connected || opts.inWindow) return { mode: "text" }; // simulator mode never needs templates
  if (opts.templateKey && !opts.allowTemplates) {
    return { mode: "skip", reason: "Skipped to stay free: the patient's 24-hour window is closed. Turn on \"Allow paid template messages\" in Settings to send this as a template." };
  }
  if (opts.templateKey && opts.templateName) {
    return { mode: "template", name: opts.templateName, language: opts.templateLanguage || "en" };
  }
  return {
    mode: "fail",
    error: opts.templateKey
      ? "Outside the 24-hour window and no approved template is configured (Settings → WhatsApp templates)."
      : "Outside the 24-hour window: the patient must message first (free-form text is not allowed).",
  };
}

/** Template body variables may not contain newlines/tabs or long runs of spaces. */
export function sanitizeTemplateParam(v: string): string {
  return v.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 900) || "-";
}

export function templatePayload(to: string, name: string, language: string, params: string[]) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name,
      language: { code: language },
      ...(params.length > 0
        ? { components: [{ type: "body", parameters: params.map((t) => ({ type: "text", text: sanitizeTemplateParam(t) })) }] }
        : {}),
    },
  };
}

// Meta error codes that will never succeed on retry (window closed, template missing/rejected/paused, bad number...)
const PERMANENT_CODES = new Set([100, 131008, 131009, 131026, 131047, 131051, 131052, 132000, 132001, 132005, 132007, 132012, 132015, 132016, 133010]);

export function classifyHttpError(status: number, bodyText: string): { retryable: boolean; error: string } {
  let code: number | undefined;
  let msg = "";
  try {
    const j = JSON.parse(bodyText) as { error?: { code?: number; message?: string; error_data?: { details?: string } } };
    code = j.error?.code;
    msg = j.error?.error_data?.details || j.error?.message || "";
  } catch {
    /* not JSON */
  }
  const permanent = code !== undefined && PERMANENT_CODES.has(code);
  const retryable = !permanent && (status === 429 || status >= 500);
  return { retryable, error: `HTTP ${status}${code ? ` (code ${code})` : ""}: ${(msg || bodyText).slice(0, 300)}` };
}

async function post(creds: Creds, payload: unknown): Promise<SendResult> {
  if (!creds.phoneNumberId || !creds.accessToken) {
    // Not connected to Meta yet: keep the conversation local (simulator mode).
    return { ok: true, simulated: true };
  }
  try {
    const res = await fetch(`${GRAPH_BASE()}/${GRAPH_VERSION}/${creds.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const json = (await res.json().catch(() => ({}))) as { messages?: Array<{ id?: string }> };
      return { ok: true, id: json.messages?.[0]?.id };
    }
    const c = classifyHttpError(res.status, await res.text().catch(() => ""));
    return { ok: false, ...c };
  } catch (e) {
    return { ok: false, retryable: true, error: e instanceof Error ? e.message : "network error" };
  }
}

export function sendWhatsAppText(creds: Creds, to: string, body: string): Promise<SendResult> {
  return post(creds, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body },
  });
}

export function sendWhatsAppTemplate(creds: Creds, to: string, name: string, language: string, params: string[]): Promise<SendResult> {
  return post(creds, templatePayload(to, name, language, params));
}

/** Exponential backoff with jitter: 30s, 60s, 2m, 4m, 8m, 16m … capped at 1h. */
export function backoffSeconds(attempt: number, rand: () => number = Math.random): number {
  const base = Math.min(30 * 2 ** Math.max(0, attempt - 1), 3600);
  return Math.round(base * (0.85 + rand() * 0.3));
}

export const MAX_SEND_ATTEMPTS = 6;
