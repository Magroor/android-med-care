"use client";

import { useState } from "react";
import Thread, { type ThreadMessage } from "@/components/Thread";
import { api, usePoll } from "@/lib/client";

const SAMPLES = [
  "Hi",
  "I'd like to book an appointment tomorrow at 10am",
  "Do you have any slots on Friday morning?",
  "What are your clinic hours?",
  "I have a fever and headache since yesterday",
  "I have severe chest pain and can't breathe",
  "How should I prepare for a blood test?",
  "YES",
  "1",
  "RESCHEDULE",
  "CANCEL",
  "Assalamualaikum",
  "AJ clinic khula h y ni",
  "kal subah 10 bje appointment chahiye",
  "haan",
  "fees kitni hai",
  "clinic kahan hai",
  "seene mein dard hai",
  "نہیں آ سکتا",
  "کلینک کھلا ہے؟",
];

export default function SimulatorPage() {
  const [phone, setPhone] = useState("923001234567");
  const [name, setName] = useState("Ali Raza");
  const [text, setText] = useState("");
  // Patient id returned by /api/simulate, remembered per phone so it's used until the lookup catches up.
  const [created, setCreated] = useState<{ digits: string; id: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const digits = phone.replace(/\D/g, "");
  const lookup = usePoll<{ patients: { id: number; phone: string }[] }>(digits.length >= 7 ? `/api/patients?q=${digits}` : null, 4000);
  const hitId = lookup.data?.patients.find((p) => p.phone === digits)?.id ?? null;
  const patientId = hitId ?? (created?.digits === digits ? created.id : null);

  const thread = usePoll<{ messages: ThreadMessage[]; timezone: string }>(patientId ? `/api/patients/${patientId}` : null, 2500);

  async function send(msg: string) {
    if (!msg.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await api<{ patientId?: number }>("/api/simulate", { method: "POST", json: { phone, name, text: msg } });
      if (res.patientId) setCreated({ digits, id: res.patientId });
      setText("");
      lookup.reload();
      thread.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold">WhatsApp simulator</h1>
      <p className="mb-3 text-sm text-slate-500">
        Pretend to be a patient. Messages go through the exact pipeline the WhatsApp webhook uses: classify → triage → book → auto-reply → log.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Patient phone" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Profile name" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
      </div>

      <div className="mt-3 min-h-64 rounded-2xl bg-[#e7efe9] p-3">
        {thread.data ? (
          <Thread messages={thread.data.messages} tz={thread.data.timezone} />
        ) : (
          <p className="py-16 text-center text-sm text-slate-500">Send a message to start a conversation.</p>
        )}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {SAMPLES.map((s) => (
          <button key={s} disabled={busy} onClick={() => send(s)} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-teal-50">
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="mt-2 flex gap-2"
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a patient message…" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-600" />
        <button disabled={busy || !text.trim()} className="rounded-xl bg-teal-600 px-5 font-medium text-white disabled:opacity-40">
          Send
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
