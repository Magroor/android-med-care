"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePoll } from "@/lib/client";

type Alerts = {
  urgent: { id: number; patientId: number; body: string; name: string | null; phone: string }[];
  pendingBookings: number;
};

const NAV = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/patients", label: "Chats", icon: "💬" },
  { href: "/appointments", label: "Calendar", icon: "📅" },
  { href: "/simulator", label: "Simulator", icon: "🧪" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "square";
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 0.18);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* autoplay blocked until the first user gesture */
  }
}

/* ---------- notification permission as an external store (no setState-in-effect) ---------- */
const permListeners = new Set<() => void>();
function subscribePerm(cb: () => void) {
  permListeners.add(cb);
  return () => permListeners.delete(cb);
}
function notifyPerm() {
  permListeners.forEach((cb) => cb());
}
function getPerm(): string {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}
const getPermServer = () => "granted"; // hide the button during SSR/hydration

/* ---------- iOS (non-standalone) detection for the Add to Home Screen hint ---------- */
const noopSubscribe = () => () => {};
function getNeedsA2HS(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function saveSubscription(sub: PushSubscription) {
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
}

/** Must be called from a user tap: asks permission, then subscribes to Web Push. */
async function enableAlerts(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  const perm = await Notification.requestPermission();
  notifyPerm();
  if (perm !== "granted" || !pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const res = await fetch("/api/push/subscribe");
      const { publicKey } = (await res.json()) as { publicKey: string | null };
      if (!publicKey) return false;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    await saveSubscription(sub);
    return true;
  } catch (err) {
    console.warn("Push subscription failed", err);
    return false;
  }
}

/** Shows an in-app urgent notification via the SW (same tag as server push, so no double alert). */
async function showUrgentNotification(id: number, patientId: number) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const title = "🚨 Urgent patient message";
  const options: NotificationOptions = {
    body: "New urgent patient message. Tap to open.",
    tag: "urgent-" + id,
    requireInteraction: true,
    icon: "/icons/icon-192.png",
    data: { url: `/patients/${patientId}` },
  };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    /* e.g. Android Chrome without a SW: banner + beep still alert the doctor */
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname.startsWith("/login") || pathname.startsWith("/privacy") || pathname.startsWith("/manual");
  const { data } = usePoll<Alerts>(isLogin ? null : "/api/alerts", 5000);
  const seen = useRef<Set<number> | null>(null);
  const notifPerm = useSyncExternalStore(subscribePerm, getPerm, getPermServer);
  const needsA2HS = useSyncExternalStore(noopSubscribe, getNeedsA2HS, () => false);
  // null = unknown yet; false = permission granted but this device has no push subscription
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        setSubscribed(!!sub);
        // Keep the server copy in sync (idempotent upsert) when already logged in.
        if (sub && !isLogin) await saveSubscription(sub).catch(() => {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLogin]);

  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.urgent.map((u) => u.id));
    if (seen.current) {
      const fresh = data.urgent.filter((u) => !seen.current!.has(u.id));
      if (fresh.length > 0) {
        beep();
        void showUrgentNotification(fresh[0].id, fresh[0].patientId);
      }
    }
    seen.current = ids;
  }, [data]);

  if (isLogin) return <>{children}</>;

  const showEnable =
    !needsA2HS && (notifPerm === "default" || (notifPerm === "granted" && pushSupported() && subscribed === false));

  const urgent = data?.urgent ?? [];

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-teal-800">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white">✚</span>
            MedAssist
          </Link>
          {showEnable && (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await enableAlerts();
                setSubscribed(ok);
                setBusy(false);
              }}
              className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-60"
            >
              🔔 {busy ? "Enabling…" : "Enable urgent alerts"}
            </button>
          )}
        </div>
        {needsA2HS && (
          <p className="border-t border-teal-100 bg-teal-50 px-4 py-1.5 text-xs text-teal-800">
            For urgent alerts on iPhone: tap Share, then <b>Add to Home Screen</b>, and open MedAssist from there.
          </p>
        )}
        {urgent.length > 0 && (
          <Link
            href={`/patients/${urgent[0].patientId}`}
            className="flex animate-pulse items-start gap-2 bg-red-600 px-4 py-2 text-sm text-white"
          >
            <span>🚨</span>
            <span className="min-w-0 flex-1">
              <b>
                {urgent.length} urgent {urgent.length === 1 ? "message" : "messages"}
              </b>{" "}
              — {urgent[0].name ?? "+" + urgent[0].phone}: <span className="line-clamp-1">{urgent[0].body}</span>
            </span>
          </Link>
        )}
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">
        {children}
        <p className="mt-8 text-center text-[11px] text-slate-400">Designed &amp; developed by <b className="font-semibold text-slate-500">Muhammad Aun</b></p>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-3xl border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-5">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                    active ? "text-teal-700" : "text-slate-500"
                  }`}
                >
                  <span className={`rounded-full px-4 py-0.5 text-lg ${active ? "bg-teal-100" : ""}`}>{n.icon}</span>
                  {n.label}
                  {n.href === "/appointments" && (data?.pendingBookings ?? 0) > 0 && (
                    <span className="absolute right-4 top-1 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">
                      {data!.pendingBookings}
                    </span>
                  )}
                  {n.href === "/patients" && urgent.length > 0 && (
                    <span className="absolute right-4 top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">
                      {urgent.length}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
