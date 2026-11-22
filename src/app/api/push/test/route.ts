import { NextResponse } from "next/server";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { guard } from "@/lib/auth";
import { sendPushToAll } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Sends a harmless test notification to every registered device so the doctor can confirm alerts work. */
export async function POST() {
  const denied = await guard();
  if (denied) return denied;
  const [{ n }] = await db.select({ n: count() }).from(pushSubscriptions);
  await sendPushToAll({ title: "✅ MedAssist test alert", body: "Alerts are working on this device.", tag: "test", url: "/settings" });
  return NextResponse.json({ ok: true, devices: Number(n) });
}
