import * as webpushNs from "web-push";

// web-push is CommonJS: under Node ESM interop the API may live on `.default`.
const webpush = ((webpushNs as unknown as { default?: typeof webpushNs }).default ?? webpushNs) as typeof webpushNs;
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

export type PushPayload = {
  title: string;
  /** Keep minimal: shown on the lock screen. Never include medical details. */
  body: string;
  tag?: string;
  url?: string;
};

let configured: boolean | null = null;

function configure(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!pub || !priv) return (configured = false);
  try {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  } catch (err) {
    console.error("[push] invalid VAPID config", err);
    configured = false;
  }
  return configured;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/** Sends a push to every saved subscription. Never throws; no-op without VAPID keys. */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  try {
    if (!configure()) return;
    const subs = await db.select().from(pushSubscriptions);
    if (subs.length === 0) return;
    const data = JSON.stringify({
      title: payload.title,
      body: payload.body,
      tag: payload.tag,
      url: payload.url ?? "/",
    });
    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data, {
            TTL: 60 * 60,
            urgency: "high",
            timeout: 5000,
          });
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, s.endpoint));
          } else {
            console.error("[push] send failed", status ?? err);
          }
        }
      }),
    );
  } catch (err) {
    console.error("[push] sendPushToAll failed", err);
  }
}
