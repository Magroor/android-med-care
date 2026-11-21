import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, messages, patients } from "@/db/schema";
import { guard } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Lightweight poll used by the app shell to raise urgent-keyword alerts. */
export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const urgent = await db
    .select({
      id: messages.id,
      patientId: messages.patientId,
      body: messages.body,
      createdAt: messages.createdAt,
      name: patients.name,
      phone: patients.phone,
    })
    .from(messages)
    .innerJoin(patients, eq(patients.id, messages.patientId))
    .where(and(eq(messages.direction, "in"), eq(messages.urgent, true), eq(messages.read, false)))
    .orderBy(desc(messages.createdAt))
    .limit(10);
  const pending = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.status, "pending"));
  return NextResponse.json({ urgent, pendingBookings: pending.length });
}
