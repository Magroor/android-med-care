import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { guard } from "@/lib/auth";
import { getVapidPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Public VAPID key for pushManager.subscribe. */
export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey() });
}

function validEndpoint(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 2048) return false;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  } | null;
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (
    !validEndpoint(endpoint) ||
    typeof p256dh !== "string" ||
    typeof auth !== "string" ||
    !p256dh ||
    !auth ||
    p256dh.length > 512 ||
    auth.length > 512
  ) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  await db
    .insert(pushSubscriptions)
    .values({ endpoint, p256dh, auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { p256dh, auth } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, body.endpoint));
  return NextResponse.json({ ok: true });
}
