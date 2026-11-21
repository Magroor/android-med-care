import { NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { setAppointmentStatus } from "@/lib/service";

const STATUSES = ["pending", "confirmed", "cancelled", "completed", "no_show"] as const;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const id = Number((await ctx.params).id);
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (!Number.isInteger(id) || !status || !(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const row = await setAppointmentStatus(id, status as (typeof STATUSES)[number]);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ appointment: row });
}
