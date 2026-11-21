import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, messages, patients } from "@/db/schema";
import { guard } from "@/lib/auth";
import { isOpenNow } from "@/lib/scheduling";
import { getSettings } from "@/lib/settings";
import { addDaysYMD, todayYMD, zonedToUtc } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const s = await getSettings();
  const now = new Date();
  const today = todayYMD(now, s.timezone);
  const tomorrow = addDaysYMD(today, 1);
  const start = zonedToUtc(today.year, today.month, today.day, 0, 0, s.timezone);
  const end = zonedToUtc(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, s.timezone);

  const apptSelect = {
    id: appointments.id,
    startsAt: appointments.startsAt,
    durationMin: appointments.durationMin,
    consultType: appointments.consultType,
    status: appointments.status,
    patientConfirmed: appointments.patientConfirmed,
    patientId: patients.id,
    patientName: patients.name,
    phone: patients.phone,
  };

  const [todayAppts, pendingAppts, urgent, unread, todayMsgs, intents, queue] = await Promise.all([
    db
      .select(apptSelect)
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(and(gte(appointments.startsAt, start), lt(appointments.startsAt, end), inArray(appointments.status, ["pending", "confirmed", "completed", "no_show"])))
      .orderBy(asc(appointments.startsAt)),
    db
      .select(apptSelect)
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(and(eq(appointments.status, "pending"), gte(appointments.startsAt, now)))
      .orderBy(asc(appointments.startsAt))
      .limit(20),
    db
      .select({ id: messages.id, body: messages.body, createdAt: messages.createdAt, patientId: patients.id, name: patients.name, phone: patients.phone })
      .from(messages)
      .innerJoin(patients, eq(patients.id, messages.patientId))
      .where(and(eq(messages.direction, "in"), eq(messages.urgent, true), eq(messages.read, false)))
      .orderBy(desc(messages.createdAt))
      .limit(20),
    db
      .select({ id: messages.id, body: messages.body, intent: messages.intent, createdAt: messages.createdAt, patientId: patients.id, name: patients.name, phone: patients.phone })
      .from(messages)
      .innerJoin(patients, eq(patients.id, messages.patientId))
      .where(and(eq(messages.direction, "in"), eq(messages.read, false), eq(messages.urgent, false)))
      .orderBy(desc(messages.createdAt))
      .limit(8),
    db
      .select({ direction: messages.direction, n: sql<number>`count(*)::int` })
      .from(messages)
      .where(gte(messages.createdAt, start))
      .groupBy(messages.direction),
    db
      .select({ intent: messages.intent, n: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.direction, "in"), gte(messages.createdAt, start)))
      .groupBy(messages.intent),
    db
      .select({ status: messages.status, n: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.direction, "out"), inArray(messages.status, ["queued", "failed"])))
      .groupBy(messages.status),
  ]);

  const count = (st: string) => todayAppts.filter((a) => a.status === st).length;
  return NextResponse.json({
    clinic: { name: s.clinicName, doctor: s.doctorName, timezone: s.timezone, openNow: isOpenNow(now, s) },
    summary: {
      appointmentsToday: todayAppts.length,
      confirmedToday: count("confirmed"),
      pendingToday: count("pending"),
      completedToday: count("completed"),
      incomingToday: todayMsgs.find((m) => m.direction === "in")?.n ?? 0,
      autoRepliesToday: todayMsgs.find((m) => m.direction === "out")?.n ?? 0,
      intents: intents.map((i) => ({ intent: i.intent ?? "unknown", n: i.n })),
      queued: queue.find((q) => q.status === "queued")?.n ?? 0,
      failed: queue.find((q) => q.status === "failed")?.n ?? 0,
    },
    todayAppts,
    pendingAppts,
    urgent,
    unread,
    whatsappConnected: !!(s.phoneNumberId && s.accessToken),
  });
}
