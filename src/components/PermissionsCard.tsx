"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { isKeepAwakeOn, setKeepAwake, wakeLockSupported } from "@/lib/keepAwake";
import { pushSupported, subscribeToPush } from "@/lib/pushClient";

type Status = { installed: boolean; notif: string; push: boolean; storage: boolean; online: boolean; awake: boolean };

async function read(): Promise<Status> {
  await Promise.resolve();
  const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return {
    installed: window.matchMedia("(display-mode: standalone)").matches,
    notif: typeof Notification === "undefined" ? "unsupported" : Notification.permission,
    push: !!sub,
    storage: (await navigator.storage?.persisted?.()) ?? false,
    online: navigator.onLine,
    awake: isKeepAwakeOn(),
  };
}

const Row = ({ ok, label, action }: { ok: boolean; label: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
    <span>{ok ? "✅" : "⚠️"} {label}</span>
    {!ok && action}
  </div>
);
const btn = "shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white";

export default function PermissionsCard() {
  const [s, setS] = useState<Status | null>(null);
  const [msg, setMsg] = useState("");
  const refresh = () => void read().then(setS);
  useEffect(() => {
    void read().then(setS);
  }, []);

  async function enablePush() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
    setMsg((await subscribeToPush()) ? "Alerts enabled on this device." : "Could not enable alerts. Check the browser's notification setting for this site.");
    refresh();
  }

  return (
    <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Permissions &amp; reliability (this device)</h2>
      <p className="mb-2 text-xs text-slate-500">A web app cannot run a hidden background service. Reliable alerts come from push notifications, which wake the phone even when the app is closed.</p>
      {s && (
        <div className="grid gap-2">
          <Row ok={s.online} label="Connected to the internet" />
          <Row ok={s.installed} label="Installed as an app" action={<span className="text-xs text-slate-500">Chrome ⋮ → Install app</span>} />
          <Row ok={s.notif === "granted"} label="Notifications allowed" action={<button className={btn} onClick={enablePush}>Allow</button>} />
          <Row ok={s.push} label="Push alerts registered" action={<button className={btn} onClick={enablePush} disabled={!pushSupported()}>Enable</button>} />
          <Row ok={s.storage} label="Data kept safe on this device" action={<button className={btn} onClick={async () => { await navigator.storage?.persist?.(); refresh(); }}>Allow</button>} />
          {wakeLockSupported() && (
            <label className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span>🖥 Keep screen on while the app is open</span>
              <input type="checkbox" className="h-4 w-4" checked={s.awake} onChange={async (e) => { await setKeepAwake(e.target.checked); refresh(); }} />
            </label>
          )}
          <button className="w-fit rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium" onClick={async () => { try { const r = await api<{ devices: number }>("/api/push/test", { method: "POST" }); setMsg(`Test alert sent to ${r.devices} device(s).`); } catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); } }}>
            Send a test alert
          </button>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-emerald-700">{msg}</p>}
      <details className="mt-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-medium">Android: stop the phone from sleeping on alerts</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Settings → Apps → MedAssist (or Chrome) → Battery → <b>Unrestricted</b>.</li>
          <li>Settings → Apps → MedAssist → Notifications → importance <b>High</b> (sound + pop on screen).</li>
          <li>Turn off Data Saver / battery saver for this app; allow background data.</li>
          <li>Xiaomi, Oppo, Vivo, Huawei, Samsung: also allow <b>Autostart</b> / remove from &quot;sleeping apps&quot;.</li>
        </ul>
      </details>
    </section>
  );
}
