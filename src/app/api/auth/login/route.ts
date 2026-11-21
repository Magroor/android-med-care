import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings as settingsTable } from "@/db/schema";
import { SESSION_COOKIE } from "@/lib/auth";
import { createSessionToken, verifyPin } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const MAX_FAILS = 5;
const WINDOW_MS = 10 * 60_000;

// Throttle state lives in the DB (settings table) so it holds across serverless instances.
async function readThrottle() {
  const rows = await db.select().from(settingsTable).where(inArray(settingsTable.key, ["_login_fails", "_login_first"]));
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  let count = Number(m._login_fails ?? 0) || 0;
  let first = Number(m._login_first ?? 0) || 0;
  if (Date.now() - first > WINDOW_MS) {
    count = 0;
    first = Date.now();
  }
  return { count, first };
}
async function writeThrottle(count: number, first: number) {
  for (const [key, value] of [["_login_fails", String(count)], ["_login_first", String(first)]] as const) {
    await db.insert(settingsTable).values({ key, value }).onConflictDoUpdate({ target: settingsTable.key, set: { value } });
  }
}

function safeEqual(a: string, b: string) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export async function POST(req: Request) {
  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
  const s = await getSettings();
  const isProd = process.env.NODE_ENV === "production";
  const adminPin = process.env.ADMIN_PIN ?? "";

  if (!s.pinHash && !isProd) return NextResponse.json({ ok: true }); // local setup mode
  if (!s.pinHash && !adminPin) {
    return NextResponse.json({ error: "Server not configured: set the ADMIN_PIN environment variable." }, { status: 503 });
  }

  const { count, first } = await readThrottle();
  if (count >= MAX_FAILS) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }
  const ok = typeof pin === "string" && pin.length > 0 && (s.pinHash ? verifyPin(pin, s.pinHash) : safeEqual(pin, adminPin));
  if (!ok) {
    await writeThrottle(count + 1, first);
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }
  await writeThrottle(0, Date.now());
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: !!process.env.VERCEL || process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
