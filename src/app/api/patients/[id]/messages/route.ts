import { NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { dispatchPending, queueOutgoing } from "@/lib/service";

/** Doctor sends a manual WhatsApp reply into the patient's thread. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const id = Number((await ctx.params).id);
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  const body = (text ?? "").trim();
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  if (!body || body.length > 4000) return NextResponse.json({ error: "Message must be 1–4000 characters" }, { status: 400 });
  const row = await queueOutgoing(id, body, "doctor");
  await dispatchPending().catch((e) => console.error(e));
  return NextResponse.json({ ok: true, id: row.id });
}
