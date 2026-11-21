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

export async function sendWhatsAppText(
  creds: { phoneNumberId: string; accessToken: string },
  to: string,
  body: string,
): Promise<SendResult> {
  if (!creds.phoneNumberId || !creds.accessToken) {
    // Not connected to Meta yet: keep the conversation local (simulator mode).
    return { ok: true, simulated: true };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${creds.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const json = (await res.json().catch(() => ({}))) as { messages?: Array<{ id?: string }> };
      return { ok: true, id: json.messages?.[0]?.id };
    }
    const errText = (await res.text().catch(() => "")).slice(0, 300);
    const retryable = res.status === 429 || res.status >= 500;
    return { ok: false, retryable, error: `HTTP ${res.status}: ${errText}` };
  } catch (e) {
    return { ok: false, retryable: true, error: e instanceof Error ? e.message : "network error" };
  }
}

/** Exponential backoff with jitter: 30s, 60s, 2m, 4m, 8m, 16m … capped at 1h. */
export function backoffSeconds(attempt: number, rand: () => number = Math.random): number {
  const base = Math.min(30 * 2 ** Math.max(0, attempt - 1), 3600);
  return Math.round(base * (0.85 + rand() * 0.3));
}

export const MAX_SEND_ATTEMPTS = 6;
