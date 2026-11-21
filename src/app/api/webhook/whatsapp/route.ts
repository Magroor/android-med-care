import { NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { verifyMetaSignature } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";
import { handleIncoming } from "@/lib/service";
import { parseWebhookPayload } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Meta webhook verification handshake. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const settings = await getSettings();
  if (mode === "subscribe" && token && token === settings.verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

/** Incoming messages + delivery receipts from the WhatsApp Business Cloud API. */
export async function POST(req: Request) {
  const raw = await req.text();
  const settings = await getSettings();

  if (!settings.appSecret && process.env.NODE_ENV === "production") {
    // never accept unsigned webhooks on a public deployment
    return new Response("Webhook not configured: set the App Secret in Settings", { status: 401 });
  }
  if (settings.appSecret) {
    if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), settings.appSecret)) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const { messages: incoming, statuses } = parseWebhookPayload(body);

  for (const st of statuses) {
    // delivery receipts: sent -> delivered -> read (never downgrade a failure into success silently)
    const status = st.status === "failed" ? "failed" : st.status;
    await db
      .update(messages)
      .set({ status })
      .where(and(eq(messages.waMessageId, st.id), eq(messages.direction, "out"), ne(messages.status, "read")));
  }

  // Always answer 200 so Meta doesn't redeliver forever; log per-message failures.
  for (const m of incoming) {
    try {
      await handleIncoming({
        phone: m.from,
        name: m.name,
        text: m.text,
        waMessageId: m.id,
        source: "whatsapp",
        unsupportedType: m.type === "text" || m.text ? undefined : m.type,
      });
    } catch (e) {
      console.error("webhook message failed", m.id, e);
    }
  }
  return NextResponse.json({ received: incoming.length });
}
