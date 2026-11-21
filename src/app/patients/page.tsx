"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { displayName, fmtDateTime, timeAgo, usePoll } from "@/lib/client";

type Row = {
  id: number;
  name: string | null;
  phone: string;
  lastIntent: string | null;
  lastMessageAt: string | null;
  unread: number;
  urgentUnread: number;
  lastBody: string | null;
  nextAppt: string | null;
};

export default function PatientsPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading } = usePoll<{ patients: Row[] }>(`/api/patients?q=${encodeURIComponent(debounced)}`, 6000);
  const rows = data?.patients ?? [];

  return (
    <div>
      <h1 className="text-xl font-bold">Patient chats</h1>
      <p className="mb-3 text-sm text-slate-500">Every WhatsApp conversation, one profile per phone number.</p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name or phone…"
        className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-teal-600"
      />
      {loading && !data && <p className="py-8 text-center text-slate-500">Loading…</p>}
      {data && rows.length === 0 && (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          {debounced ? "No patients match your search." : "No conversations yet. Messages sent to your WhatsApp number — or from the Simulator — will appear here."}
        </div>
      )}
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm">
        {rows.map((p) => (
          <li key={p.id}>
            <Link href={`/patients/${p.id}`} className={`flex gap-3 p-3 hover:bg-slate-50 ${p.urgentUnread ? "bg-red-50" : ""}`}>
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-semibold ${p.urgentUnread ? "bg-red-600 text-white" : "bg-teal-100 text-teal-800"}`}>
                {(p.name ?? "#").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{displayName(p)}</span>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo(p.lastMessageAt)}</span>
                </div>
                <p className="truncate text-sm text-slate-600">{p.lastBody ?? "—"}</p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                  {p.urgentUnread > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 font-semibold text-white">🚨 urgent</span>}
                  {p.unread > 0 && <span className="rounded-full bg-teal-600 px-2 py-0.5 font-semibold text-white">{p.unread} new</span>}
                  {p.lastIntent && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{p.lastIntent}</span>}
                  {p.nextAppt && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">📅 {fmtDateTime(p.nextAppt)}</span>}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
