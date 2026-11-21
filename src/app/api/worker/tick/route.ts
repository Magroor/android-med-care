import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { runMaintenance } from "@/lib/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function validBearer(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Background tick (reminders + retry queue). Idempotent; only does due work.
 * Auth: `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this automatically when CRON_SECRET
 * is set; external pingers must send it) or a valid doctor session.
 */
async function handle(req: Request) {
  if (!validBearer(req) && !(process.env.NODE_ENV !== "production" ? true : await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runMaintenance());
}

export const GET = handle;
export const POST = handle;
