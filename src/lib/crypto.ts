import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Master key resolution order:
 * 1. APP_ENCRYPTION_KEY env var (recommended in production; keep it in a secret manager / KMS)
 * 2. A random 256-bit key generated once and stored in .data/master.key (chmod 600)
 * Secrets (WhatsApp token, app secret, verify token) are encrypted with AES-256-GCM before hitting the DB.
 */
let cachedKey: Buffer | null = null;

function masterKey(): Buffer {
  if (cachedKey) return cachedKey;
  const env = process.env.APP_ENCRYPTION_KEY;
  if (env) {
    cachedKey = crypto.createHash("sha256").update(env).digest();
    return cachedKey;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_ENCRYPTION_KEY is required in production (e.g. `openssl rand -hex 32`).");
  }
  try {
    const dir = path.join(process.cwd(), ".data");
    const file = path.join(dir, "master.key");
    if (fs.existsSync(file)) {
      cachedKey = Buffer.from(fs.readFileSync(file, "utf8").trim(), "hex");
      if (cachedKey.length === 32) return cachedKey;
    }
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const key = crypto.randomBytes(32);
    fs.writeFileSync(file, key.toString("hex"), { mode: 0o600 });
    cachedKey = key;
    return key;
  } catch {
    cachedKey = crypto
      .createHash("sha256")
      .update(process.env.DATABASE_URL ?? "medassist-fallback")
      .digest();
    return cachedKey;
  }
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return "v1:" + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(payload: string): string {
  if (!payload.startsWith("v1:")) return "";
  try {
    const raw = Buffer.from(payload.slice(3), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(pin, Buffer.from(saltHex, "hex"), 32);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function sessionKey(): Buffer {
  return crypto.createHmac("sha256", masterKey()).update("session-v1").digest();
}

export function createSessionToken(ttlSeconds = 60 * 60 * 12): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = crypto.createHmac("sha256", sessionKey()).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto.createHmac("sha256", sessionKey()).update(expStr).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function randomToken(bytes = 18): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Stable secret used to authorise the read-only .ics calendar feed (calendar apps can't send cookies). */
export function calendarKey(): string {
  return crypto.createHmac("sha256", masterKey()).update("calendar-v1").digest("hex").slice(0, 32);
}
