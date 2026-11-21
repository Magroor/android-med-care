import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSettings } from "./settings";
import { verifySessionToken } from "./crypto";

export const SESSION_COOKIE = "medassist_session";

export async function isAuthenticated(): Promise<boolean> {
  const s = await getSettings();
  // Setup mode (no PIN yet) is open only for local development. In production a session
  // (ADMIN_PIN bootstrap or configured PIN) is always required.
  if (!s.pinHash && process.env.NODE_ENV !== "production") return true;
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** Returns a 401 response when a PIN is configured and the caller has no valid session. */
export async function guard(): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
