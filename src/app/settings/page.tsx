"use client";

import { useEffect, useState } from "react";
import { api, hardNavigate } from "@/lib/client";

type PublicSettings = {
  clinicName: string;
  doctorName: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  workDays: number[];
  slotMinutes: number;
  emergencyNumber: string;
  address: string;
  prepInstructions: string;
  consultationFee: string;
  defaultLanguage: "en" | "ur";
  autoReply: boolean;
  autoConfirm: boolean;
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
      <p className="mt-6 text-center text-xs text-slate-400">
        The assistant gives administrative and preliminary guidance only — it never diagnoses. All automated medical replies carry a disclaimer.
      </p>
    </div>
  );
}
