import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { calendarKey } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");

/** Subscribable iCalendar feed (Google/Apple/Outlook calendar). Authorised by session or ?key=. */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (key !== calendarKey() && !(await isAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const s = await getSettings();
  const rows = await db
    .select({ a: appointments, p: patients })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(and(gte(appointments.startsAt, new Date(Date.now() - 7 * 86400_000)), inArray(appointments.status, ["pending", "confirmed"])));

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MedAssist//WhatsApp Doctor Assistant//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(s.clinicName)} appointments`];
  for (const { a, p } of rows) {
    const end = new Date(a.startsAt.getTime() + a.durationMin * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:appt-${a.id}@medassist`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(a.startsAt)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${esc(`${a.consultType}: ${p.name ?? p.phone}${a.status === "pending" ? " (pending)" : ""}`)}`,
      `DESCRIPTION:${esc(`WhatsApp: +${p.phone}`)}`,
      `STATUS:${a.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" },
  });
}
