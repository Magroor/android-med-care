"use client";

import { useEffect, useRef } from "react";

export type ThreadMessage = {
  id: number;
  direction: string;
  body: string;
  intent: string | null;
  urgent: boolean;
  source: string;
  status: string;
  lastError: string | null;
  createdAt: string;
};

const STATUS_ICON: Record<string, string> = {
  queued: "⏳ queued",
  sending: "⏳ sending",
  sent: "✓ sent",
  delivered: "✓✓ delivered",
  read: "✓✓ read",
  simulated: "✓ local",
  failed: "⚠ failed",
};

export default function Thread({ messages, tz, autoScroll = true }: { messages: ThreadMessage[]; tz?: string; autoScroll?: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  const count = messages.length;
  useEffect(() => {
    if (autoScroll) end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [count, autoScroll]);

  const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
  const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const days = messages.map((m) => dayFmt.format(new Date(m.createdAt)));

  return (
    <div className="space-y-2">
      {messages.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No messages to show.</p>}
      {messages.map((m, i) => {
        const day = days[i];
        const showDay = i === 0 || day !== days[i - 1];
        const out = m.direction === "out";
        return (
          <div key={m.id}>
            {showDay && <div className="my-3 text-center text-xs font-medium text-slate-400">{day}</div>}
            <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  m.urgent ? "border-2 border-red-400 bg-red-50 text-red-950" : out ? "bg-teal-600 text-white" : "bg-white text-slate-900"
                } ${out ? "rounded-br-sm" : "rounded-bl-sm"}`}
              >
                {m.urgent && <div className="mb-1 text-xs font-bold uppercase text-red-700">🚨 Urgent</div>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <div className={`mt-1 flex flex-wrap items-center gap-x-2 text-[10px] ${out ? "text-teal-100" : "text-slate-400"}`}>
                  <span>{timeFmt.format(new Date(m.createdAt))}</span>
                  {out && m.source !== "simulator" && (
                    <span>
                      {m.source === "auto" ? "🤖 auto" : m.source === "reminder" ? "⏰ reminder" : m.source === "doctor" ? "👨‍⚕️ doctor" : m.source}
                    </span>
                  )}
                  {m.intent && !out && <span className="rounded bg-slate-100 px-1 text-slate-500">{m.intent}</span>}
                  {out && <span title={m.lastError ?? undefined}>{STATUS_ICON[m.status] ?? m.status}</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}
