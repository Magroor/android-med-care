import Link from "next/link";
import type { ReactNode } from "react";
import PrintButton from "./PrintButton";

export type TocItem = { id: string; label: string };

/** Page frame shared by both manuals: sticky mini-header, hero, table of contents, footer credit. */
export function ManualShell({
  title,
  subtitle,
  badge,
  toc,
  children,
  other,
}: {
  title: string;
  subtitle: string;
  badge: string;
  toc: TocItem[];
  children: ReactNode;
  other: { href: string; label: string };
}) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800 print:bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-teal-800">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal-600 text-white">✚</span>
            MedAssist
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <Link href={other.href} className="whitespace-nowrap rounded-full bg-teal-50 px-3 py-1.5 font-medium text-teal-800 hover:bg-teal-100">
              {other.label}
            </Link>
            <PrintButton />
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 px-4 py-10 text-white print:bg-teal-800">
        <div className="mx-auto max-w-4xl">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide">{badge}</span>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-teal-50/90">{subtitle}</p>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 pb-16">
        <nav aria-label="Contents" className="-mt-6 rounded-2xl bg-white p-4 shadow-md print:mt-4 print:shadow-none">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">In this guide</p>
          <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {toc.map((t, i) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="flex gap-2 rounded px-1 py-0.5 hover:bg-teal-50">
                  <span className="w-5 shrink-0 text-right font-semibold text-teal-700">{i + 1}.</span>
                  <span>{t.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {children}

        <footer className="mt-14 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          <p>MedAssist · Designed &amp; developed by <b className="text-slate-700">Muhammad Aun</b></p>
          <p className="mt-1">Meta’s screens and policies change; if a button name differs slightly, follow the same idea. See COMPLIANCE.md for policy notes.</p>
        </footer>
      </main>
    </div>
  );
}

export function Section({ id, n, title, intro, children }: { id: string; n: number; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-16 print:break-inside-avoid-page">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-600 text-lg font-bold text-white">{n}</span>
        <div>
          <h2 className="text-2xl font-bold leading-tight text-slate-900">{title}</h2>
          {intro && <p className="mt-1 text-slate-600">{intro}</p>}
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function Card({ title, children, tone = "white" }: { title?: string; children: ReactNode; tone?: "white" | "teal" | "slate" }) {
  const tones = { white: "bg-white", teal: "bg-teal-50 border border-teal-100", slate: "bg-slate-100" };
  return (
    <div className={`rounded-2xl p-4 shadow-sm print:break-inside-avoid print:shadow-none ${tones[tone]}`}>
      {title && <h3 className="mb-2 font-semibold text-slate-900">{title}</h3>}
      <div className="text-sm leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

type CalloutKind = "tip" | "warn" | "danger" | "info";
const CALLOUT: Record<CalloutKind, { icon: string; cls: string; label: string }> = {
  tip: { icon: "💡", cls: "border-emerald-200 bg-emerald-50 text-emerald-900", label: "Tip" },
  warn: { icon: "⚠️", cls: "border-amber-200 bg-amber-50 text-amber-900", label: "Careful" },
  danger: { icon: "⛔", cls: "border-red-200 bg-red-50 text-red-900", label: "Never" },
  info: { icon: "ℹ️", cls: "border-sky-200 bg-sky-50 text-sky-900", label: "Note" },
};
export function Callout({ kind = "tip", title, children }: { kind?: CalloutKind; title?: string; children: ReactNode }) {
  const c = CALLOUT[kind];
  return (
    <div className={`flex gap-3 rounded-xl border p-3 text-sm print:break-inside-avoid ${c.cls}`}>
      <span aria-hidden className="text-lg leading-none">{c.icon}</span>
      <div>
        <p className="font-semibold">{title ?? c.label}</p>
        <div className="mt-0.5 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/** Numbered step with optional "where" chip and body. */
export function Step({ n, title, where, children }: { n: number | string; title: string; where?: string; children?: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm print:break-inside-avoid print:shadow-none">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-600 text-sm font-bold text-white">{n}</span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {where && <p className="mt-0.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">{where}</p>}
        {children && <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>}
      </div>
    </div>
  );
}

export function Code({ children, label }: { children: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900 print:break-inside-avoid">
      {label && <div className="border-b border-slate-700 px-3 py-1 text-[11px] text-slate-400">{label}</div>}
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-slate-100"><code>{children}</code></pre>
    </div>
  );
}

export function K({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[12px] text-slate-800">{children}</kbd>;
}

// ------------------------------------------------------------------ infographics

export type FlowNode = { icon: string; title: string; caption: string; tone?: "teal" | "slate" | "amber" | "red" | "emerald" };
const NODE_TONE = {
  teal: "bg-teal-600 text-white",
  slate: "bg-slate-800 text-white",
  amber: "bg-amber-500 text-white",
  red: "bg-red-600 text-white",
  emerald: "bg-emerald-600 text-white",
};

/** Horizontal flow on desktop, vertical on phones. */
export function Flow({ nodes }: { nodes: FlowNode[] }) {
  return (
    <ol className="flex flex-col items-stretch gap-2 md:flex-row md:items-stretch md:gap-0 print:flex-row">
      {nodes.map((n, i) => (
        <li key={n.title} className="flex flex-1 flex-col items-stretch md:flex-row md:items-center print:flex-row print:items-center">
          <div className="flex-1 rounded-2xl bg-white p-3 text-center shadow-sm print:shadow-none">
            <span className={`mx-auto grid h-11 w-11 place-items-center rounded-xl text-xl ${NODE_TONE[n.tone ?? "teal"]}`} aria-hidden>
              {n.icon}
            </span>
            <p className="mt-2 text-sm font-semibold text-slate-900">{n.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">{n.caption}</p>
          </div>
          {i < nodes.length - 1 && (
            <span aria-hidden className="py-1 text-center text-xl font-bold text-teal-600 md:px-1.5 md:py-0 print:px-1.5 print:py-0">
              <span className="md:hidden print:hidden">↓</span>
              <span className="hidden md:inline print:inline">→</span>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Numbered marker used on annotated mock-ups. */
export function Pin({ n }: { n: number }) {
  return <span className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-600 text-[11px] font-bold text-white shadow ring-2 ring-white">{n}</span>;
}

export function Legend({ items }: { items: { n: number; title: string; text: string }[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((i) => (
        <li key={i.n} className="flex gap-2 rounded-xl bg-white p-3 text-sm shadow-sm print:break-inside-avoid print:shadow-none">
          <Pin n={i.n} />
          <span>
            <b className="text-slate-900">{i.title}.</b> <span className="text-slate-600">{i.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Phone-shaped frame for UI mock-ups. */
export function Phone({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <figure className="mx-auto w-full max-w-[300px] print:break-inside-avoid">
      <div className="rounded-[2rem] border-[6px] border-slate-800 bg-slate-50 p-2 shadow-xl print:shadow-none">
        <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-slate-300" />
        <div className="space-y-2">{children}</div>
      </div>
      {caption && <figcaption className="mt-2 text-center text-xs text-slate-500">{caption}</figcaption>}
    </figure>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm print:shadow-none">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100 align-top last:border-0">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
