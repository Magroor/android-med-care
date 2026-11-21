"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import Thread, { type ThreadMessage } from "@/components/Thread";
import VoiceNote from "@/components/VoiceNote";
import { api, fmtDateTime, STATUS_STYLES, usePoll } from "@/lib/client";

type Detail = {
  timezone: string;
  patient: { id: number; name: string | null; phone: string; summary: string | null; lastIntent: string | null; createdAt: string };
  messages: ThreadMessage[];
  appointments: { id: number; startsAt: string; consultType: string; status: string; patientConfirmed: boolean }[];
  notes: { id: number; body: string; source: string; createdAt: string }[];
};

type Tab = "chat" | "appointments" | "notes";

export default function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("chat");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [dir, setDir] = useState<"all" | "in" | "out">("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [noteSource, setNoteSource] = useState<"typed" | "voice">("typed");
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const url = `/api/patients/${id}?q=${encodeURIComponent(dq)}&dir=${dir}${urgentOnly ? "&urgent=1" : ""}`;
  const { data, error: loadError, reload } = usePoll<Detail>(url, 4000);

  // opening the thread acknowledges unread / urgent messages
  const lastMsgId = data?.messages.length ? data.messages[data.messages.length - 1].id : 0;
  const loaded = !!data;
  useEffect(() => {
    if (!loaded) return;
    api(`/api/patients/${id}/read`, { method: "POST" }).catch(() => {});
  }, [id, lastMsgId, loaded]);

  if (!data) return <p className="py-10 text-center text-slate-500">{loadError ?? "Loading…"}</p>;
  const { patient, timezone: tz } = data;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const sendReply = () =>
    run(async () => {
      await api(`/api/patients/${id}/messages`, { method: "POST", json: { text: reply } });
      setReply("");
    });

  const saveNote = () =>
    run(async () => {
      await api(`/api/patients/${id}/notes`, { method: "POST", json: { body: note, source: noteSource } });
      setNote("");
      setNoteSource("typed");
    });

  const saveName = () =>
    run(async () => {
      await api(`/api/patients/${id}`, { method: "PATCH", json: { name } });
      setEditingName(false);
    });

  const next = data.appointments.filter((a) => new Date(a.startsAt) > new Date() && ["pending", "confirmed"].includes(a.status));

  return (
    <div>
      <Link href="/patients" className="text-sm text-teal-700">
        ← All chats
      </Link>
      <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {editingName ? (
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 rounded-lg border border-slate-300 px-2 py-1" autoFocus />
                <button onClick={saveName} className="rounded-lg bg-teal-600 px-3 text-sm text-white">
                  Save
                </button>
              </div>
            ) : (
              <h1
                className="cursor-pointer truncate text-xl font-bold"
                title="Click to rename"
                onClick={() => {
                  setName(patient.name ?? "");
                  setEditingName(true);
                }}
              >
                {patient.name ?? `+${patient.phone}`} <span className="text-sm font-normal text-slate-400">✎</span>
              </h1>
            )}
            <a href={`https://wa.me/${patient.phone}`} target="_blank" rel="noreferrer" className="text-sm text-slate-500 hover:underline">
              +{patient.phone} · open in WhatsApp
            </a>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Since {new Date(patient.createdAt).toLocaleDateString()}</div>
            {patient.lastIntent && <div>Last: {patient.lastIntent}</div>}
          </div>
        </div>
        {next[0] && (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">
            📅 Next: {fmtDateTime(next[0].startsAt, tz)} · {next[0].consultType} ({next[0].status})
          </p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 rounded-xl bg-slate-200 p-1 text-sm font-medium">
        {(["chat", "appointments", "notes"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg py-1.5 capitalize ${tab === t ? "bg-white shadow-sm" : "text-slate-600"}`}>
            {t === "chat" ? "Timeline" : t === "appointments" ? `Visits (${data.appointments.length})` : `Notes (${data.notes.length})`}
          </button>
        ))}
      </div>

      {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {tab === "chat" && (
        <div className="mt-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search this conversation…"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
            />
            {(["all", "in", "out"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDir(d)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${dir === d ? "bg-teal-600 text-white" : "bg-white text-slate-600"}`}
              >
                {d === "all" ? "All" : d === "in" ? "Patient" : "Replies"}
              </button>
            ))}
            <button
              onClick={() => setUrgentOnly(!urgentOnly)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${urgentOnly ? "bg-red-600 text-white" : "bg-white text-slate-600"}`}
            >
              🚨 Urgent
            </button>
          </div>
          <Thread messages={data.messages} tz={tz} autoScroll={!dq && dir === "all" && !urgentOnly} />
          <div className="sticky bottom-20 mt-4 flex gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-slate-200">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={1}
              placeholder="Reply on WhatsApp as the doctor…"
              className="min-h-10 flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none"
            />
            <button disabled={busy || !reply.trim()} onClick={sendReply} className="rounded-xl bg-teal-600 px-4 font-medium text-white disabled:opacity-40">
              Send
            </button>
          </div>
        </div>
      )}

      {tab === "appointments" && (
        <ul className="mt-3 space-y-2">
          {data.appointments.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-slate-500 shadow-sm">No appointments yet.</p>}
          {data.appointments.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
              <div>
                <div className="font-medium">{fmtDateTime(a.startsAt, tz)}</div>
                <div className="text-xs text-slate-500">{a.consultType}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}>{a.status.replace("_", " ")}</span>
            </li>
          ))}
        </ul>
      )}

      {tab === "notes" && (
        <div className="mt-3">
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
              }}
              rows={4}
              placeholder="Post-consultation summary, diagnosis, plan…"
              className="w-full resize-none rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-teal-600"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <VoiceNote
                onText={(t) => {
                  setNote((prev) => (prev ? prev + " " : "") + t);
                  setNoteSource("voice");
                }}
              />
              <button disabled={busy || !note.trim()} onClick={saveNote} className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40">
                Save note
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">Notes stay on this server and are never sent to the patient.</p>
          </div>
          <ul className="mt-3 space-y-2">
            {data.notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-white p-3 shadow-sm">
                <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {n.source === "voice" ? "🎙 Voice" : "✍️ Typed"} · {fmtDateTime(n.createdAt, tz)}
                  </span>
                  <button
                    onClick={() => {
                      if (confirm("Delete this note?")) run(() => api(`/api/patients/${id}/notes?noteId=${n.id}`, { method: "DELETE" }));
                    }}
                    className="text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
