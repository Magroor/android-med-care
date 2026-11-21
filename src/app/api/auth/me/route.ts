import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSettings();
  const authed = await isAuthenticated();
  return NextResponse.json(
    { authenticated: authed, pinEnabled: !!s.pinHash },
    { status: authed ? 200 : 401 },
  );
}
