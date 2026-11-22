"use client";

import { useEffect, useState } from "react";
import { api, hardNavigate } from "@/lib/client";
import { TEMPLATES, TEMPLATE_KEYS } from "@/lib/templates";

type PublicSettings = {
  clinicName: string;
  doctorName: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  workDays: number[];
  slotMinutes: number;
  emergencyNumber: string;
  clinicPhone: string;
  address: string;
  prepInstructions: string;
  consultationFee: string;
  defaultLanguage: "en" | "ur";
  autoReply: boolean;
  autoConfirm: boolean;
  allowTemplates: boolean;
  templateReminderEn: string;
  templateReminderUr: string;
  templateUpdateEn: string;
  templateUpdateUr: string;
  templateLangEn: string;
  templateLangUr: string;
  phoneNumberId: string;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  verifyToken: string;
  pinEnabled: boolean;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Card({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      <div className="mt-2 grid gap-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600";

export default function SettingsPage() {
  const [s, setS] = useState<PublicSettings | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [pin, setPin] = useState("");
  const [wipeText, setWipeText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    api<{ settings: PublicSettings }>("/api/settings", { signal: ctrl.signal })
      .then((r) => setS(r.settings))
      .catch((e) => {
        if (!ctrl.signal.aborted) setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed to load settings" });
      });
    return () => ctrl.abort();
  }, []);

  if (!s) return <p className="py-10 text-center text-slate-500">{msg?.text ?? "Loading…"}</p>;

  // Only reached after settings load on the client, so `window` is always defined here and the
  // server-rendered markup (the loading state) never contains it.
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const set = <K extends keyof PublicSettings>(k: K, v: PublicSettings[K]) => setS({ ...s, [k]: v });

  async function save(extra: Record<string, unknown> = {}) {
    if (!s) return;
    setSaving(true);
    setMsg(null);
    try {
      const { hasAccessToken, hasAppSecret, verifyToken, pinEnabled, ...plain } = s;
      void hasAccessToken, hasAppSecret, verifyToken, pinEnabled;
      const res = await api<{ settings: PublicSettings }>("/api/settings", {
        method: "PUT",
        json: { ...plain, accessToken, appSecret, pin, ...extra },
      });
      setS(res.settings);
      setAccessToken("");
      setAppSecret("");
      setPin("");
      setMsg({ ok: true, text: "Saved ✓" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  const webhookUrl = `${origin}/api/webhook/whatsapp`;

  return (
    <div>
      <h1 className="text-xl font-bold">Settings</h1>

      <Card title="Clinic">
        <Field label="Clinic name">
          <input className={input} value={s.clinicName} onChange={(e) => set("clinicName", e.target.value)} />
        </Field>
        <Field label="Doctor name">
          <input className={input} value={s.doctorName} onChange={(e) => set("doctorName", e.target.value)} />
        </Field>
        <Field label="Address (shared when patients ask for location)">
          <input className={input} value={s.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Clinic phone / WhatsApp Business number (shown when a patient asks for a person)">
          <input className={input} placeholder="+92 3XX XXXXXXX" value={s.clinicPhone ?? ""} onChange={(e) => set("clinicPhone", e.target.value)} />
        </Field>
        <Field label="Emergency helpline number">
          <input className={input} value={s.emergencyNumber} onChange={(e) => set("emergencyNumber", e.target.value)} />
        </Field>
        <Field label="Consultation fee &amp; payment methods (shown when patients ask)">
          <input className={input} placeholder="e.g. Rs 1500 in-person, Rs 1000 online; cash / JazzCash / bank transfer" value={s.consultationFee ?? ""} onChange={(e) => set("consultationFee", e.target.value)} />
        </Field>
        <Field label="Reply language when unknown (patients' language is auto-detected)">
          <select className={input} value={s.defaultLanguage ?? "ur"} onChange={(e) => set("defaultLanguage", e.target.value as "en" | "ur")}>
            <option value="ur">Roman Urdu</option>
            <option value="en">English</option>
          </select>
        </Field>
        <Field label="Visit preparation instructions">
          <textarea rows={3} className={input} value={s.prepInstructions} onChange={(e) => set("prepInstructions", e.target.value)} />
        </Field>
      </Card>

      <Card title="Availability" hint="Outside these hours the auto-responder tells patients the clinic is closed and shows the emergency helpline.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opens">
            <input type="time" className={input} value={s.openTime} onChange={(e) => set("openTime", e.target.value)} />
          </Field>
          <Field label="Closes">
            <input type="time" className={input} value={s.closeTime} onChange={(e) => set("closeTime", e.target.value)} />
          </Field>
          <Field label="Slot length (minutes)">
            <input type="number" min={10} max={120} step={5} className={input} value={s.slotMinutes} onChange={(e) => set("slotMinutes", Number(e.target.value))} />
          </Field>
          <Field label="Timezone (IANA)">
            <input className={input} value={s.timezone} onChange={(e) => set("timezone", e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => (
            <button
              type="button"
              key={d}
              onClick={() => set("workDays", s.workDays.includes(i) ? s.workDays.filter((x) => x !== i) : [...s.workDays, i])}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${s.workDays.includes(i) ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {d}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Automation">
        <label className="flex items-center justify-between text-sm">
          <span>
            <b>AI auto-responder</b>
            <span className="block text-xs text-slate-500">Reply to patients instantly. Emergency replies are always sent.</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-teal-600" checked={s.autoReply} onChange={(e) => set("autoReply", e.target.checked)} />
        </label>
        <label className="flex items-center justify-between text-sm">
          <span>
            <b>Auto-confirm bookings</b>
            <span className="block text-xs text-slate-500">Off = bookings wait for your approval on the dashboard.</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-teal-600" checked={s.autoConfirm} onChange={(e) => set("autoConfirm", e.target.checked)} />
        </label>
      </Card>

      <button onClick={() => save()} disabled={saving} className="mt-4 w-full rounded-xl bg-teal-600 py-3 font-semibold text-white disabled:opacity-50">
        {saving ? "Saving…" : "Save settings"}
      </button>
      {msg && <p className={`mt-2 text-center text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}

      <Card
        title="WhatsApp Business Cloud API"
        hint="Meta for Developers → your app → WhatsApp → API Setup / Configuration. Secrets are encrypted (AES-256-GCM) before being stored and never sent back to the browser."
      >
        <Field label="Callback URL (paste into Meta webhook config — must be public HTTPS)">
          <input readOnly className={`${input} bg-slate-50`} value={webhookUrl} onFocus={(e) => e.currentTarget.select()} />
        </Field>
        <Field label="Verify token (paste into Meta)">
          <div className="flex gap-2">
            <input readOnly className={`${input} bg-slate-50`} value={s.verifyToken} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={() => save({ rotateVerifyToken: true })} className="shrink-0 rounded-lg bg-slate-100 px-3 text-xs">
              Rotate
            </button>
          </div>
        </Field>
        <Field label="Phone number ID">
          <input className={input} value={s.phoneNumberId} onChange={(e) => set("phoneNumberId", e.target.value)} />
        </Field>
        <Field label={`Permanent access token ${s.hasAccessToken ? "(saved — leave blank to keep)" : ""}`}>
          <input type="password" autoComplete="off" className={input} value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder={s.hasAccessToken ? "••••••••••••" : "EAAG…"} />
        </Field>
        <Field label={`App secret — verifies webhook signatures ${s.hasAppSecret ? "(saved)" : ""}`}>
          <input type="password" autoComplete="off" className={input} value={appSecret} onChange={(e) => setAppSecret(e.target.value)} placeholder={s.hasAppSecret ? "••••••••••••" : "Strongly recommended"} />
        </Field>
        {!s.hasAppSecret && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Without an app secret anyone who finds your webhook URL could inject fake patient messages.</p>}
        <p className="text-xs text-slate-500">
          Note: WhatsApp only allows free-form replies within 24 hours of the patient&apos;s last message. Reminders sent outside that window require an approved message template in Meta Business Manager.
        </p>
        <div className="flex gap-2">
          <button onClick={() => save()} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white">
            Save credentials
          </button>
          {s.hasAccessToken && (
            <button onClick={() => save({ clearAccessToken: true })} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">
              Disconnect
            </button>
          )}
        </div>
      </Card>

      <Card
        title="WhatsApp templates (needed for reminders)"
        hint="WhatsApp allows free-form text only within 24h of the patient's last message. Reminders and clinic updates sent after that must use templates you create in Meta WhatsApp Manager → Message templates (category: Utility). Paste the exact text below, then enter each approved template's name here."
      >
        <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={s.allowTemplates} onChange={(e) => set("allowTemplates", e.target.checked)} />
          <span>
            <b>Allow paid template messages</b> (off = free). When the patient&apos;s 24-hour window is closed, reminders are skipped instead of being sent as paid templates. Reminders still go out for free whenever the patient has written in the last 24 hours.
          </span>
        </label>
        {TEMPLATE_KEYS.map((k) => {
          const t = TEMPLATES[k];
          const cap = k === "reminder" ? "Reminder" : "Update";
          return (
            <div key={k} className="rounded-xl border border-slate-200 p-3">
              <p className="mb-2 text-sm font-medium">
                {cap} template · variables: {t.variables.map((v, i) => `{{${i + 1}}} ${v}`).join(", ")}
              </p>
              {(["ur", "en"] as const).map((l) => {
                const nameKey = (k === "reminder" ? (l === "ur" ? "templateReminderUr" : "templateReminderEn") : l === "ur" ? "templateUpdateUr" : "templateUpdateEn") as
                  | "templateReminderUr" | "templateReminderEn" | "templateUpdateUr" | "templateUpdateEn";
                return (
                  <div key={l} className="mb-3 last:mb-0">
                    <p className="text-xs font-medium text-slate-500">{l === "ur" ? "Roman Urdu" : "English"} — text to submit (suggested name: {t.suggestedName[l]})</p>
                    <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs text-slate-700">{t.body[l]}</pre>
                    <p className="mt-1 text-[11px] text-slate-400">Sample values: {t.example[l].join(" | ")}</p>
                    <input className={input + " mt-1"} placeholder={`Approved template name, e.g. ${t.suggestedName[l]}`} value={s[nameKey]} onChange={(e) => set(nameKey, e.target.value.trim())} />
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Language code — Roman Urdu templates">
            <input className={input} value={s.templateLangUr} onChange={(e) => set("templateLangUr", e.target.value.trim())} />
          </Field>
          <Field label="Language code — English templates">
            <input className={input} value={s.templateLangEn} onChange={(e) => set("templateLangEn", e.target.value.trim())} />
          </Field>
        </div>
        <p className="text-xs text-slate-500">Roman Urdu is not a Meta language, so file those templates under English (en) unless you wrote them in Urdu script (ur).</p>
        <button onClick={() => save()} className="w-fit rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white">
          Save templates
        </button>
      </Card>

      <Card title="Security" hint="Protect patient data with a PIN. The webhook endpoint stays public (it is verified by signature).">
        <Field label={s.pinEnabled ? "Change PIN (4–12 digits)" : "Set a PIN (4–12 digits)"}>
          <input type="password" inputMode="numeric" className={input} value={pin} onChange={(e) => setPin(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <button onClick={() => save()} disabled={!pin} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            {s.pinEnabled ? "Update PIN" : "Enable PIN"}
          </button>
          {s.pinEnabled && (
            <>
              <button onClick={() => save({ removePin: true })} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">
                Remove PIN
              </button>
              <button
                onClick={async () => {
                  try {
                    await api("/api/auth/logout", { method: "POST" });
                    hardNavigate("/login");
                  } catch (e) {
                    setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not lock" });
                  }
                }}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700"
              >
                Lock now
              </button>
            </>
          )}
        </div>
      </Card>

      <Card
        title="Flush demo data"
        hint="Deletes ALL patients, chats, appointments and clinical notes (for example the demo/test data before you go live). Your clinic settings, WhatsApp credentials, templates and PIN are kept. This cannot be undone."
      >
        <Field label="Type DELETE to confirm">
          <input className={input} value={wipeText} onChange={(e) => setWipeText(e.target.value)} placeholder="DELETE" autoComplete="off" />
        </Field>
        <button
          disabled={wipeText !== "DELETE"}
          onClick={async () => {
            try {
              const r = await api<{ deleted: { patients: number; messages: number; appointments: number; notes: number } }>("/api/admin/reset", {
                method: "POST",
                json: { confirm: "DELETE" },
              });
              setWipeText("");
              setMsg({ ok: true, text: `Flushed: ${r.deleted.patients} patients, ${r.deleted.messages} messages, ${r.deleted.appointments} appointments, ${r.deleted.notes} notes.` });
            } catch (e) {
              setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not flush data" });
            }
          }}
          className="w-fit rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Flush all patient data
        </button>
      </Card>
      <Card title="Help & guides" hint="Illustrated manuals you can read on your phone or save as PDF.">
        <div className="flex flex-wrap gap-2">
          <a href="/manual" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white">📘 User manual</a>
          <a href="/manual/whatsapp-setup" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800">🔗 WhatsApp linking guide</a>
          <a href="/privacy" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800">🔒 Privacy policy</a>
        </div>
      </Card>
      <p className="mt-6 text-center text-xs text-slate-400">
        The assistant gives administrative and preliminary guidance only — it never diagnoses. All automated medical replies carry a disclaimer.
      </p>
    </div>
  );
}
