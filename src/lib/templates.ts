import type { Lang } from "./lang";

/**
 * WhatsApp only allows free-form text within 24h of the patient's last message. Reminders and
 * clinic-initiated updates usually fall outside that window, so they are sent as pre-approved
 * TEMPLATES. Submit the texts below in Meta WhatsApp Manager → Message templates (category: UTILITY),
 * then enter the template names in Settings.
 */
export type TemplateKey = "reminder" | "update";

export const TEMPLATE_KEYS: TemplateKey[] = ["reminder", "update"];

export type TemplateSpec = {
  key: TemplateKey;
  /** suggested name for the template in Meta (lowercase, digits, underscores) */
  suggestedName: Record<Lang, string>;
  /** Meta body text; variables appear in order {{1}} {{2}} {{3}} and never start or end the text */
  body: Record<Lang, string>;
  /** example values Meta asks for when you submit the template */
  example: Record<Lang, string[]>;
  /** what {{1}}, {{2}}, {{3}} contain */
  variables: string[];
};

export const TEMPLATES: Record<TemplateKey, TemplateSpec> = {
  reminder: {
    key: "reminder",
    suggestedName: { en: "appointment_reminder_en", ur: "appointment_reminder_ur" },
    body: {
      en: "Reminder: your appointment with {{1}} ({{2}}) is on {{3}}. Reply CONFIRM to confirm, RESCHEDULE to pick another time, or CANCEL.",
      ur: "Yaad dehani: {{1}} ke saath aap ki appointment ({{2}}) {{3}} ko hai. Confirm ke liye CONFIRM, doosra waqt chunne ke liye RESCHEDULE, ya CANCEL likhein.",
    },
    example: {
      en: ["Dr. Waqas", "consultation", "Mon, Nov 23, 10:00 AM"],
      ur: ["Dr. Waqas", "consultation", "Mon, Nov 23, 10:00 AM"],
    },
    variables: ["doctor name", "consultation type", "date & time"],
  },
  update: {
    key: "update",
    suggestedName: { en: "appointment_update_en", ur: "appointment_update_ur" },
    body: {
      en: "Update from {{1}}: your appointment on {{2}} has been {{3}}. Reply BOOK to schedule a new time.",
      ur: "Ittila: {{1}} ki taraf se aap ki {{2}} ki appointment {{3}}. Naye waqt ke liye BOOK likhein.",
    },
    example: {
      en: ["Dr. Waqas", "Mon, Nov 23, 10:00 AM", "confirmed"],
      ur: ["Dr. Waqas", "Mon, Nov 23, 10:00 AM", "confirm ho gayi hai"],
    },
    variables: ["doctor name", "date & time", "status"],
  },
};

/** Variable values for a template, in the order {{1}}, {{2}}, {{3}}. */
export function reminderParams(doctor: string, consultType: string, when: string): string[] {
  return [doctor, consultType, when];
}

export function updateParams(lang: Lang, doctor: string, when: string, status: "confirmed" | "cancelled"): string[] {
  const word =
    lang === "ur"
      ? status === "confirmed"
        ? "confirm ho gayi hai"
        : "cancel kar di gayi hai"
      : status;
  return [doctor, when, word];
}

/** Render the template body with its variables (for the thread view / logs). */
export function renderTemplate(key: TemplateKey, lang: Lang, params: string[]): string {
  return TEMPLATES[key].body[lang].replace(/\{\{(\d)\}\}/g, (_m, n: string) => params[Number(n) - 1] ?? "");
}

export function isTemplateKey(v: unknown): v is TemplateKey {
  return v === "reminder" || v === "update";
}

export const TEMPLATE_NAME_RE = /^[a-z0-9_]{0,512}$/;
export const TEMPLATE_LANG_RE = /^[a-z]{2,3}(_[A-Z]{2})?$/;
