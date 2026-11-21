"use client";

import Link from "next/link";
import { useState } from "react";
import { api, displayName, fmtDay, fmtTime, STATUS_STYLES, usePoll } from "@/lib/client";

type Appt = {
  id: number;
  startsAt: string;
  consultType: string;
  status: string;
  patientConfirmed: boolean;
  source: string;
  patientId: number;
  patientName: string | null;
  phone: string;
};

export default function AppointmentsPage() {
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phone: "", name: "", when: "", consultType: "consultation" });
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const { data, reload, loading } = usePoll<{ appointments: Appt[]; timezone: string }>(`/api/appointments?scope=${scope}`, 6000);
  const tz = data?.timezone;

  async function setStatus(id: number, status: string) {
    setError("");
    try {
      await api(`/api/appointments/${id}`, { method: "PATCH", json: { status } });
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function addBooking(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      // the browser's datetime-local value is in the doctor's local time; the server validates against clinic hours
      await api("/api/appointments", {
        method: "POST",
        json: { phone: form.phone, name: form.name, startsAt: new Date(form.when).toISOString(), consultType: form.consultType },
      });
      setShowForm(false);
      setForm({ phone: "", name: "", when: "", consultType: "consultation" });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function copyFeed() {
    const { calendarKey } = await api<{ calendarKey: string }>("/api/settings");
    const url = `${window.location.origin}/api/appointments/ics?key=${calendarKey}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const groups = new Map<string, Appt[]>();
  for (const a of data?.appointments ?? []) {
    const key = fmtDay(a.startsAt, tz);
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Appointments</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded-full bg-teal-600 px-4 py-1.5 text-sm font-medium text-white">
          {showForm ? "Close" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addBooking} className="mt-3 grid gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <input required placeholder="Patient WhatsApp number (with country code)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
          <input placeholder="Patient name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
          <input required type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
          <select value={form.consultType} onChange={(e) => setForm({ ...form, consultType: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2">
            <option>consultation</option>
            <option>follow-up</option>
            <option>general check-up</option>
            <option>video consultation</option>
          </select>
          <button className="rounded-lg bg-teal-600 py-2 font-medium text-white">Reserve slot</button>
          <p className="text-xs text-slate-500">Uses the same working-hours and double-booking rules as the WhatsApp bot.</p>
        </form>
      )}
      {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="mt-3 grid grid-cols-2 rounded-xl bg-slate-200 p-1 text-sm font-medium">
        {(["upcoming", "past"] as const).map((s) => (
          <button key={s} onClick={() => setScope(s)} className={`rounded-lg py-1.5 capitalize ${scope === s ? "bg-white shadow-sm" : "text-slate-600"}`}>
            {s}
          </button>
        ))}
      </div>

      {loading && !data && <p className="py-8 text-center text-slate-500">Loading…</p>}
      {data && data.appointments.length === 0 && <p className="mt-4 rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">No {scope} appointments.</p>}

      {[...groups.entries()].map(([day, list]) => (
        <section key={day} className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-500">{day}</h2>
          <ul className="space-y-2">
            {list.map((a) => (
              <li key={a.id} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-teal-800">{fmtTime(a.startsAt, tz)}</div>
                    <Link href={`/patients/${a.patientId}`} className="block truncate font-medium hover:underline">
                      {displayName({ name: a.patientName, phone: a.phone })}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {a.consultType} · booked via {a.source}
                      {a.patientConfirmed && a.status === "confirmed" ? " · patient confirmed" : ""}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}>{a.status.replace("_", " ")}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {a.status === "pending" && (
                    <button onClick={() => setStatus(a.id, "confirmed")} className="rounded-lg bg-teal-600 px-3 py-1.5 font-medium text-white">
                      Approve
                    </button>
                  )}
                  {a.status === "confirmed" && (
                    <>
                      <button onClick={() => setStatus(a.id, "completed")} className="rounded-lg bg-sky-100 px-3 py-1.5 font-medium text-sky-800">
                        Mark completed
                      </button>
                      <button onClick={() => setStatus(a.id, "no_show")} className="rounded-lg bg-rose-50 px-3 py-1.5 text-rose-700">
                        No-show
                      </button>
                    </>
                  )}
                  {(a.status === "pending" || a.status === "confirmed") && (
                    <button
                      onClick={() => {
                        if (confirm("Cancel this appointment and notify the patient?")) setStatus(a.id, "cancelled");
                      }}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
        <b>Calendar sync:</b> subscribe in Google, Apple or Outlook Calendar using a private feed URL.
        <button onClick={copyFeed} className="ml-2 rounded-lg bg-white px-3 py-1 text-xs font-medium text-teal-700 shadow-sm">
          {copied ? "Copied ✓" : "Copy feed URL"}
        </button>
      </div>
    </div>
  );
}
