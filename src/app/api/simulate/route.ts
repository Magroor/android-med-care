import { NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { handleIncoming } from "@/lib/service";

export const dynamic = "force-dynamic";

/** Simulates an incoming WhatsApp message (for testing the full pipeline without Meta). */
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { phone?: string; name?: string; text?: string };
  const phone = (body.phone ?? "").replace(/\D/g, "");
  const text = (body.text ?? "").trim();
  if (phone.length < 7 || phone.length > 15) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Message is empty" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Message too long" }, { status: 400 });
  const result = await handleIncoming({ phone, name: body.name, text, source: "simulator" });
  return NextResponse.json(result);
}
