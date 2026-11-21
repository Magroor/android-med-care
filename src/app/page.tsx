"use client";

import Link from "next/link";
import { api, displayName, fmtTime, STATUS_STYLES, timeAgo, usePoll } from "@/lib/client";

type Appt = {
  id: number;
  startsAt: string;
  consultType: string;
  status: string;
  patientConfirmed: boolean;
  patientId: number;
  patientName: string | null;
  phone: string;
};
type Msg = { id: number; body: string; createdAt: string; patientId: number; name: string | null; phone: string; intent?: string | null };
type Dash = {
  clinic: { name: string; doctor: string; timezone: string; openNow: boolean };
  summary: {
    appointmentsToday: number;
    confirmedToday: number;
    pendingToday: number;
    completedToday: number;
    incomingToday: number;
    autoRepliesToday: number;
    intents: { intent: string; n: number }[];
    queued: number;
    failed: number;
  };
  todayAppts: Appt[];
  pendingAppts: Appt[];
  urgent: Msg[];
  unread: Msg[];
  whatsappConnected: boolean;
};

const INTENT_LABEL: Record<string, string> = {
  booking: "Booking",
  reschedule: "Reschedule",
  cancel: "Cancel",
  confirm: "Confirmations",
  choose: "Slot choices",
  hours: "Clinic hours",
  location: "Location",
  symptoms: "Symptoms",
  medication: "Medication",
  preparation: "Preparation",
  greeting: "Greetings",
  thanks: "Thanks",
  emergency: "Emergency",
  unknown: "Needs review",
  unsupported: "Unsupported",
};

function Stat({ label, value, tone, href }: { label: string; value: number | string; tone: string; href?: string }) {
  const inner = (
    <div className={`rounded-2xl p-4 ${tone}`}>
      <div className="text-3xl font-bold leading-none">{value}</div>
      <div className="mt-1.5 text-xs font-medium opacity-80">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const { data, error, loading, reload } = usePoll<Dash>("/api/dashboard", 5000);
  if (loading && !data) return <p className="py-10 text-center text-slate-500">Loading dashboard…</p>;
  if (!data) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error ?? "Could not load dashboard"}</p>;
  const tz = data.clinic.timezone;
  const total = data.summary.intents.reduce((a, b) => a + b.n, 0) || 1;

  async function setStatus(id: number, status: string) {
    await api(`/api/appointments/${id}`, { method: "PATCH", json: { status } });
    reload();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{data.clinic.doctor}</h1>
          <p className="text-sm text-slate-500">{data.clinic.name}</p>
        </div>
        <div className="flex gap-2 text-xs font-medium">
          <span className={`rounded-full px-2.5 py-1 ${data.clinic.openNow ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
            {data.clinic.openNow ? "● Clinic open" : "🌙 After hours (auto-responder on)"}
          </span>
          <span className={`rounded-full px-2.5 py-1 ${data.whatsappConnected ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {data.whatsappConnected ? "WhatsApp connected" : "Simulator mode"}
          </span>
        </div>
      </div>

      {!data.whatsappConnected && (
        <Link href="/settings" className="mt-3 block rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          WhatsApp Business isn&apos;t connected yet — replies are only stored locally. Add your Cloud API credentials in Settings, or try the{" "}
          <span className="font-semibold underline">Simulator</span>.
        </Link>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Appointments today" value={data.summary.appointmentsToday} tone="bg-teal-600 text-white" href="/appointments" />
        <Stat label="Pending bookings" value={data.pendingAppts.length} tone="bg-amber-100 text-amber-900" href="/appointments" />
        <Stat label="Unread urgent" value={data.urgent.length} tone={data.urgent.length ? "bg-red-600 text-white" : "bg-white text-slate-700 shadow-sm"} href="/patients" />
        <Stat label={`Messages today · ${data.summary.autoRepliesToday} sent`} value={data.summary.incomingToday} tone="bg-white text-slate-700 shadow-sm" href="/patients" />
      </div>

      {(data.summary.failed > 0 || data.summary.queued > 0) && (
        <p className="mt-3 rounded-xl bg-slate-200 p-3 text-xs text-slate-700">
          Outbox: {data.summary.queued} waiting to send (auto-retry with backoff){data.summary.failed > 0 && `, ${data.summary.failed} failed permanently — check your WhatsApp token`}.
        </p>
      )}

      {data.urgent.length > 0 && (
        <Section title="🚨 Urgent queries">
          <ul className="space-y-2">
            {data.urgent.map((m) => (
              <li key={m.id}>
                <Link href={`/patients/${m.patientId}`} className="block rounded-xl border-2 border-red-300 bg-red-50 p-3">
                  <div className="flex justify-between text-sm font-semibold text-red-900">
                    <span>{displayName(m)}</span>
                    <span className="text-xs font-normal">{timeAgo(m.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-red-900">{m.body}</p>
                  <p className="mt-1 text-xs text-red-700">Patient was told to call emergency services · tap to open and acknowledge</p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.pendingAppts.length > 0 && (
        <Section title="Pending bookings">
          <ul className="space-y-2">
            {data.pendingAppts.map((a) => (
              <li key={a.id} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/patients/${a.patientId}`} className="font-semibold hover:underline">
                      {displayName({ name: a.patientName, phone: a.phone })}
                    </Link>
                    <p className="text-sm text-slate-600">
                      {new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(new Date(a.startsAt))} · {fmtTime(a.startsAt, tz)} · {a.consultType}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStatus(a.id, "confirmed")} className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white">
                      Approve
                    </button>
                    <button onClick={() => setStatus(a.id, "cancelled")} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                      Decline
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Today's schedule" right={<Link href="/appointments" className="text-xs font-medium text-teal-700">View all</Link>}>
        {data.todayAppts.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-slate-500 shadow-sm">No appointments today.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl bg-white shadow-sm">
            {data.todayAppts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 p-3">
                <div className="w-16 text-sm font-semibold text-teal-800">{fmtTime(a.startsAt, tz)}</div>
                <Link href={`/patients/${a.patientId}`} className="min-w-0 flex-1">
                  <div className="truncate font-medium">{displayName({ name: a.patientName, phone: a.phone })}</div>
                  <div className="text-xs text-slate-500">
                    {a.consultType}
                    {a.patientConfirmed && a.status === "confirmed" ? " · patient confirmed" : ""}
                  </div>
                </Link>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}>{a.status.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Unread messages">
        {data.unread.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-slate-500 shadow-sm">You&apos;re all caught up.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl bg-white shadow-sm">
            {data.unread.map((m) => (
              <li key={m.id}>
                <Link href={`/patients/${m.patientId}`} className="block p-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{displayName(m)}</span>
                    <span className="text-xs text-slate-400">{timeAgo(m.createdAt)}</span>
                  </div>
                  <p className="line-clamp-1 text-sm text-slate-600">{m.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Today's patient queries">
        {data.summary.intents.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-slate-500 shadow-sm">No queries yet today.</p>
        ) : (
          <div className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
            {data.summary.intents
              .sort((a, b) => b.n - a.n)
              .map((i) => (
                <div key={i.intent} className="text-sm">
                  <div className="flex justify-between">
                    <span>{INTENT_LABEL[i.intent] ?? i.intent}</span>
                    <span className="text-slate-500">{i.n}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div
                      className={`h-1.5 rounded-full ${i.intent === "emergency" ? "bg-red-500" : "bg-teal-500"}`}
                      style={{ width: `${(i.n / total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            <p className="pt-1 text-xs text-slate-500">
              {data.summary.confirmedToday} confirmed · {data.summary.pendingToday} pending · {data.summary.completedToday} completed today
            </p>
          </div>
        )}
      </Section>
    </div>
  );
}
