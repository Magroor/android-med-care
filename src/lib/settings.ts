import { db } from "@/db";
import { settings as settingsTable } from "@/db/schema";
import { decryptSecret, encryptSecret, randomToken } from "./crypto";

export type Settings = {
  clinicName: string;
  doctorName: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  workDays: number[];
  slotMinutes: number;
  emergencyNumber: string;
  address: string;
  prepInstructions: string;
  consultationFee: string;
  defaultLanguage: "en" | "ur";
  autoReply: boolean;
  autoConfirm: boolean;
  // approved WhatsApp template names (used outside the 24h window) + their Meta language codes
  templateReminderEn: string;
  templateReminderUr: string;
  templateUpdateEn: string;
  templateUpdateUr: string;
  templateLangEn: string;
  templateLangUr: string;
  phoneNumberId: string;
  // secrets (encrypted at rest)
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  pinHash: string;
};

const DEFAULTS: Record<string, string> = {
  clinicName: "Dr. Waqas Clinic",
  doctorName: "Dr. Waqas",
  defaultLanguage: "ur",
  timezone: "Asia/Karachi",
  openTime: "09:00",
  closeTime: "17:00",
  workDays: "1,2,3,4,5,6",
  slotMinutes: "30",
  emergencyNumber: "1122",
  address: "",
  consultationFee: "",
  prepInstructions:
    "Please bring a photo ID, previous prescriptions and any recent reports. Arrive 10 minutes early. If a blood test is planned, fast for 8–10 hours unless told otherwise (water is fine).",
  autoReply: "true",
  autoConfirm: "true",
  templateReminderEn: "",
  templateReminderUr: "",
  templateUpdateEn: "",
  templateUpdateUr: "",
  templateLangEn: "en",
  templateLangUr: "en", // Roman Urdu is not a Meta language code; templates are usually filed under English
  phoneNumberId: "",
  accessToken: "",
  appSecret: "",
  verifyToken: "",
  pinHash: "",
};

const SECRET_KEYS = new Set(["accessToken", "appSecret", "verifyToken"]);

async function readRaw(): Promise<Record<string, string>> {
  const rows = await db.select().from(settingsTable);
  const out: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) {
    out[r.key] = SECRET_KEYS.has(r.key) ? decryptSecret(r.value) : r.value;
  }
  return out;
}

async function writeKey(key: string, value: string) {
  const stored = SECRET_KEYS.has(key) ? (value ? encryptSecret(value) : "") : value;
  await db
    .insert(settingsTable)
    .values({ key, value: stored })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: stored } });
}

export async function getSettings(): Promise<Settings> {
  const raw = await readRaw();
  if (!raw.verifyToken) {
    raw.verifyToken = randomToken(12);
    await writeKey("verifyToken", raw.verifyToken);
  }
  const workDays = raw.workDays
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return {
    clinicName: raw.clinicName,
    doctorName: raw.doctorName,
    timezone: raw.timezone,
    openTime: raw.openTime,
    closeTime: raw.closeTime,
    workDays,
    slotMinutes: Math.max(10, Number(raw.slotMinutes) || 30),
    emergencyNumber: raw.emergencyNumber,
    address: raw.address,
    prepInstructions: raw.prepInstructions,
    consultationFee: raw.consultationFee,
    defaultLanguage: raw.defaultLanguage === "en" ? "en" : "ur",
    autoReply: raw.autoReply !== "false",
    autoConfirm: raw.autoConfirm !== "false",
    templateReminderEn: raw.templateReminderEn,
    templateReminderUr: raw.templateReminderUr,
    templateUpdateEn: raw.templateUpdateEn,
    templateUpdateUr: raw.templateUpdateUr,
    templateLangEn: raw.templateLangEn || "en",
    templateLangUr: raw.templateLangUr || "en",
    phoneNumberId: raw.phoneNumberId,
    accessToken: raw.accessToken,
    appSecret: raw.appSecret,
    verifyToken: raw.verifyToken,
    pinHash: raw.pinHash,
  };
}

export type SettingsPatch = Partial<Omit<Settings, "workDays" | "slotMinutes" | "autoReply" | "autoConfirm">> & {
  workDays?: number[];
  slotMinutes?: number;
  autoReply?: boolean;
  autoConfirm?: boolean;
};

export async function saveSettings(patch: SettingsPatch) {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || !(key in DEFAULTS)) continue;
    const str = Array.isArray(value) ? value.join(",") : String(value);
    await writeKey(key, str);
  }
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Never send secrets to the browser. */
export function publicSettings(s: Settings) {
  return {
    clinicName: s.clinicName,
    doctorName: s.doctorName,
    timezone: s.timezone,
    openTime: s.openTime,
    closeTime: s.closeTime,
    workDays: s.workDays,
    slotMinutes: s.slotMinutes,
    emergencyNumber: s.emergencyNumber,
    address: s.address,
    prepInstructions: s.prepInstructions,
    consultationFee: s.consultationFee,
    defaultLanguage: s.defaultLanguage,
    autoReply: s.autoReply,
    autoConfirm: s.autoConfirm,
    templateReminderEn: s.templateReminderEn,
    templateReminderUr: s.templateReminderUr,
    templateUpdateEn: s.templateUpdateEn,
    templateUpdateUr: s.templateUpdateUr,
    templateLangEn: s.templateLangEn,
    templateLangUr: s.templateLangUr,
    phoneNumberId: s.phoneNumberId,
    hasAccessToken: !!s.accessToken,
    hasAppSecret: !!s.appSecret,
    verifyToken: s.verifyToken,
    pinEnabled: !!s.pinHash,
  };
}
