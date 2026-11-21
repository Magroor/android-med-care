import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { guard } from "@/lib/auth";
import { loadBusy, normalizePhone, toEngineSettings } from "@/lib/service";
import { validateSlot } from "@/lib/scheduling";
import { getSettings } from "@/lib/settings";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const scope = new URL(req.url).searchParams.get("scope") ?? "upcoming";
  const now = new Date();
  const cond = scope === "past" ? lt(appointments.startsAt, now) : gte(appointments.startsAt, new Date(now.getTime() - 60 * 60 * 1000));
  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      durationMin: appointments.durationMin,
      consultType: appointments.consultType,
      status: appointments.status,
      patientConfirmed: appointments.patientConfirmed,
      source: appointments.source,
      patientId: patients.id,
      patientName: patients.name,
      phone: patients.phone,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(and(cond))
    .orderBy(scope === "past" ? desc(appointments.startsAt) : asc(appointments.startsAt))
    .limit(200);
  const s = await getSettings();
  return NextResponse.json({ appointments: rows, timezone: s.timezone });
}

/** Doctor books a slot manually (e.g. phone call / walk-in). Same conflict rules as the bot. */
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as {
    phone?: string;
    name?: string;
    startsAt?: string;
    consultType?: string;
  };
  const phone = normalizePhone(body.phone ?? "");
  const start = new Date(body.startsAt ?? "");
  if (phone.length < 7 || phone.length > 15) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  if (Number.isNaN(start.getTime())) return NextResponse.json({ error: "Pick a date and time" }, { status: 400 });

  const s = await getSettings();
  const cfg = toEngineSettings(s);
  const check = validateSlot(start, cfg, await loadBusy(new Date()), new Date(), { leadMinutes: 0 });
  if (!check.ok) {
    const msg = { past: "That time is in the past", closed: "Clinic is closed that day", outside_hours: "Outside clinic hours", conflict: "That slot is already booked" }[check.reason];
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  let [patient] = await db.select().from(patients).where(eq(patients.phone, phone));
  if (!patient) [patient] = await db.insert(patients).values({ phone, name: body.name?.trim() || null }).returning();
  const hoursAway = (start.getTime() - Date.now()) / 3600_000;
  const [row] = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(7701)`);
    return tx
      .insert(appointments)
      .values({
        patientId: patient.id,
        startsAt: start,
        durationMin: s.slotMinutes,
        consultType: (body.consultType ?? "consultation").slice(0, 60),
        status: "confirmed",
        patientConfirmed: true,
        source: "doctor",
        reminder24Sent: hoursAway <= 24,
        reminder2Sent: hoursAway <= 2,
      })
      .returning();
  });
  return NextResponse.json({ appointment: row });
}
