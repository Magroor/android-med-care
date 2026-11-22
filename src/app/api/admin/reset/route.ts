import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, clinicalNotes, messages, patients } from "@/db/schema";
import { guard } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Flush all patient data (demo / test data): patients, chats, appointments, clinical notes.
 * Clinic settings, WhatsApp credentials, templates, PIN and push subscriptions are kept.
 * Requires {"confirm":"DELETE"} so it can never run by accident.
 */
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (confirm !== "DELETE") return NextResponse.json({ error: 'Type DELETE to confirm' }, { status: 400 });

  const result = await db.transaction(async (tx) => {
    const m = await tx.delete(messages).returning({ id: messages.id });
    const a = await tx.delete(appointments).returning({ id: appointments.id });
    const n = await tx.delete(clinicalNotes).returning({ id: clinicalNotes.id });
    const p = await tx.delete(patients).returning({ id: patients.id });
    return { patients: p.length, messages: m.length, appointments: a.length, notes: n.length };
  });
  return NextResponse.json({ ok: true, deleted: result });
}
