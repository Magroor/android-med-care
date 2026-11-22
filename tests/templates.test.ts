import { describe, expect, it } from "vitest";
import { classifyHttpError, isWithinWindow, planSend, sanitizeTemplateParam, templatePayload, WINDOW_MS } from "../src/lib/whatsapp";
import { reminderParams, renderTemplate, TEMPLATES, TEMPLATE_KEYS, TEMPLATE_LANG_RE, TEMPLATE_NAME_RE, updateParams } from "../src/lib/templates";

const NOW = new Date("2025-06-02T10:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe("24-hour customer-service window", () => {
  it("open right after a patient message", () => expect(isWithinWindow(ago(60_000), NOW)).toBe(true));
  it("open at 23h", () => expect(isWithinWindow(ago(23 * 3600_000), NOW)).toBe(true));
  it("closed at 24h", () => expect(isWithinWindow(ago(WINDOW_MS), NOW)).toBe(false));
  it("closes 10 minutes early for safety", () => expect(isWithinWindow(ago(WINDOW_MS - 5 * 60_000), NOW)).toBe(false));
  it("closed when the patient never wrote", () => {
    expect(isWithinWindow(null, NOW)).toBe(false);
    expect(isWithinWindow(undefined, NOW)).toBe(false);
  });
});

describe("planSend", () => {
  const base = { connected: true, inWindow: false, templateKey: "reminder", templateName: "appointment_reminder_ur", templateLanguage: "en", allowTemplates: true };
  it("inside window -> plain text, even for template-capable messages", () => {
    expect(planSend({ ...base, inWindow: true })).toEqual({ mode: "text" });
  });
  it("outside window + template configured -> template", () => {
    expect(planSend(base)).toEqual({ mode: "template", name: "appointment_reminder_ur", language: "en" });
  });
  it("outside window, template key but no template name -> fail fast with guidance", () => {
    const p = planSend({ ...base, templateName: "" });
    expect(p.mode).toBe("fail");
    expect((p as { error: string }).error).toContain("Settings");
  });
  it("outside window, plain message (e.g. doctor manual reply) -> fail fast, no pointless API call", () => {
    const p = planSend({ ...base, templateKey: null });
    expect(p.mode).toBe("fail");
    expect((p as { error: string }).error).toContain("must message first");
  });
  it("simulator mode (not connected) never needs templates", () => {
    expect(planSend({ ...base, connected: false })).toEqual({ mode: "text" });
    expect(planSend({ ...base, connected: false, templateKey: null })).toEqual({ mode: "text" });
  });
  it("FREE MODE: outside the window a template message is skipped, never sent", () => {
    const p = planSend({ ...base, allowTemplates: false });
    expect(p.mode).toBe("skip");
    expect((p as { reason: string }).reason).toContain("stay free");
  });
  it("free mode still sends plain text inside the window (free service message)", () => {
    expect(planSend({ ...base, allowTemplates: false, inWindow: true })).toEqual({ mode: "text" });
  });
  it("defaults the language to en", () => {
    expect(planSend({ ...base, templateLanguage: "" })).toMatchObject({ language: "en" });
  });
});

describe("template payload (Meta Cloud API shape)", () => {
  it("builds a body-parameter template message", () => {
    const p = templatePayload("923001234567", "appointment_reminder_ur", "en", ["Dr. Waqas", "consultation", "Mon, Nov 23, 10:00 AM"]);
    expect(p).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "923001234567",
      type: "template",
      template: {
        name: "appointment_reminder_ur",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "Dr. Waqas" },
              { type: "text", text: "consultation" },
              { type: "text", text: "Mon, Nov 23, 10:00 AM" },
            ],
          },
        ],
      },
    });
  });
  it("omits components when there are no variables", () => {
    expect(templatePayload("1", "hello", "en", []).template).toEqual({ name: "hello", language: { code: "en" } });
  });
  it("sanitises variables: no newlines/tabs/multi-spaces, never empty, bounded", () => {
    expect(sanitizeTemplateParam("a\nb\t c   d")).toBe("a b c d");
    expect(sanitizeTemplateParam("   ")).toBe("-");
    expect(sanitizeTemplateParam("x".repeat(5000)).length).toBe(900);
  });
});

describe("Meta error handling", () => {
  it("24h-window / template errors are permanent (no pointless retries)", () => {
    for (const code of [131047, 131051, 132000, 132001, 132012, 131026]) {
      const r = classifyHttpError(400, JSON.stringify({ error: { code, message: "x" } }));
      expect(r.retryable, String(code)).toBe(false);
      expect(r.error).toContain(`code ${code}`);
    }
  });
  it("429 and 5xx are retryable", () => {
    expect(classifyHttpError(429, "{}").retryable).toBe(true);
    expect(classifyHttpError(503, "oops").retryable).toBe(true);
  });
  it("other 4xx are not retried", () => {
    expect(classifyHttpError(401, JSON.stringify({ error: { code: 190, message: "Invalid token" } })).retryable).toBe(false);
  });
  it("non-JSON bodies are handled", () => {
    expect(classifyHttpError(500, "<html>bad gateway</html>").error).toContain("HTTP 500");
  });
});

describe("template catalog (what you submit to Meta)", () => {
  it("both templates exist in Roman Urdu and English", () => {
    for (const k of TEMPLATE_KEYS) {
      for (const l of ["en", "ur"] as const) {
        expect(TEMPLATES[k].body[l].length).toBeGreaterThan(20);
        expect(TEMPLATES[k].suggestedName[l]).toMatch(TEMPLATE_NAME_RE);
      }
    }
  });
  it("Meta rules: variables sequential from {{1}}, never at the start or end, examples provided", () => {
    for (const k of TEMPLATE_KEYS) {
      for (const l of ["en", "ur"] as const) {
        const body = TEMPLATES[k].body[l];
        const vars = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
        expect(vars, `${k}/${l}`).toEqual(vars.map((_, i) => i + 1));
        expect(body.startsWith("{{")).toBe(false);
        expect(body.endsWith("}}")).toBe(false);
        expect(TEMPLATES[k].example[l]).toHaveLength(vars.length);
        expect(TEMPLATES[k].variables).toHaveLength(vars.length);
        expect(body.length).toBeLessThanOrEqual(1024);
      }
    }
  });
  it("reminder params fill the template in order", () => {
    const p = reminderParams("Dr. Waqas", "consultation", "Mon 10:00");
    expect(renderTemplate("reminder", "ur", p)).toBe("Yaad dehani: Dr. Waqas ke saath aap ki appointment (consultation) Mon 10:00 ko hai. Confirm ke liye CONFIRM, doosra waqt chunne ke liye RESCHEDULE, ya CANCEL likhein.");
    expect(renderTemplate("reminder", "en", p)).toContain("appointment with Dr. Waqas (consultation) is on Mon 10:00");
  });
  it("update params use language-appropriate status words", () => {
    expect(updateParams("ur", "Dr. Waqas", "Mon 10:00", "confirmed")).toEqual(["Dr. Waqas", "Mon 10:00", "confirm ho gayi hai"]);
    expect(updateParams("ur", "Dr. Waqas", "Mon 10:00", "cancelled")[2]).toBe("cancel kar di gayi hai");
    expect(updateParams("en", "Dr. Waqas", "Mon 10:00", "cancelled")[2]).toBe("cancelled");
    expect(renderTemplate("update", "ur", updateParams("ur", "Dr. Waqas", "Mon 10:00", "cancelled"))).toBe(
      "Ittila: Dr. Waqas ki taraf se aap ki Mon 10:00 ki appointment cancel kar di gayi hai. Naye waqt ke liye BOOK likhein.",
    );
  });
  it("name and language validators", () => {
    expect(TEMPLATE_NAME_RE.test("appointment_reminder_ur")).toBe(true);
    expect(TEMPLATE_NAME_RE.test("Bad Name!")).toBe(false);
    expect(TEMPLATE_NAME_RE.test("")).toBe(true);
    for (const ok of ["en", "ur", "en_US"]) expect(TEMPLATE_LANG_RE.test(ok)).toBe(true);
    for (const bad of ["", "english", "EN", "en-US"]) expect(TEMPLATE_LANG_RE.test(bad)).toBe(false);
  });
});
