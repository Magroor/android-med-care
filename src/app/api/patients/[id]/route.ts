import { NextResponse } from "next/server";
import { and, asc, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { appointments, clinicalNotes, messages, patients } from "@/db/schema";
import { guard } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const denied = await guard();
  if (denied) return denied;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const [patient] = await db.select().from(patients).where(eq(patients.id, id));
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const dir = sp.get("dir");
  const filters = [eq(messages.patientId, id)];
  if (q) filters.push(ilike(messages.body, `%${q.replace(/[%_\\]/g, "\\$&")}%`));
  if (dir === "in" || dir === "out") filters.push(eq(messages.direction, dir));
  if (sp.get("urgent") === "1") filters.push(eq(messages.urgent, true));

  const [thread, appts, notes] = await Promise.all([
    db.select().from(messages).where(and(...filters)).orderBy(asc(messages.createdAt), asc(messages.id)).limit(500),
    db.select().from(appointments).where(eq(appointments.patientId, id)).orderBy(desc(appointments.startsAt)),
    db.select().from(clinicalNotes).where(eq(clinicalNotes.patientId, id)).orderBy(desc(clinicalNotes.createdAt)),
  ]);

  const s = await getSettings();
  return NextResponse.json({
    timezone: s.timezone,
    patient: { id: patient.id, name: patient.name, phone: patient.phone, summary: patient.summary, lastIntent: patient.lastIntent, createdAt: patient.createdAt },
    messages: thread,
    appointments: appts,
    notes,
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await guard();
  if (denied) return denied;
  const id = Number((await ctx.params).id);
  const body = (await req.json().catch(() => ({}))) as { name?: string; summary?: string };
  const set: { name?: string | null; summary?: string | null } = {};
  if (typeof body.name === "string") set.name = body.name.trim().slice(0, 120) || null;
  if (typeof body.summary === "string") set.summary = body.summary.trim().slice(0, 2000) || null;
  if (Object.keys(set).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const [row] = await db.update(patients).set(set).where(eq(patients.id, id)).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
