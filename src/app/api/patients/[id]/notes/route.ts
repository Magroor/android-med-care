import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clinicalNotes } from "@/db/schema";
import { guard } from "@/lib/auth";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const id = Number((await ctx.params).id);
  const { body, source } = (await req.json().catch(() => ({}))) as { body?: string; source?: string };
  const text = (body ?? "").trim();
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  if (!text || text.length > 8000) return NextResponse.json({ error: "Note must be 1–8000 characters" }, { status: 400 });
  const [row] = await db
    .insert(clinicalNotes)
    .values({ patientId: id, body: text, source: source === "voice" ? "voice" : "typed" })
    .returning();
  return NextResponse.json({ note: row });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const id = Number((await ctx.params).id);
  const noteId = Number(new URL(req.url).searchParams.get("noteId"));
  if (!Number.isInteger(id) || !Number.isInteger(noteId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  await db.delete(clinicalNotes).where(and(eq(clinicalNotes.id, noteId), eq(clinicalNotes.patientId, id)));
  return NextResponse.json({ ok: true });
}
