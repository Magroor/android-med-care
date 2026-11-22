import { NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { calendarKey, hashPin, randomToken } from "@/lib/crypto";
import { TEMPLATE_LANG_RE, TEMPLATE_NAME_RE } from "@/lib/templates";
import { getSettings, isValidTimezone, publicSettings, saveSettings, type SettingsPatch } from "@/lib/settings";

export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const s = await getSettings();
  return NextResponse.json({ settings: publicSettings(s), calendarKey: calendarKey() });
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: SettingsPatch = {};
  const str = (k: string, max = 500) => (typeof b[k] === "string" ? (b[k] as string).trim().slice(0, max) : undefined);

  for (const k of ["clinicName", "doctorName", "emergencyNumber", "clinicPhone", "phoneNumberId"] as const) {
    const v = str(k, 120);
    if (v !== undefined) patch[k] = v;
  }
  const address = str("address", 300);
  if (address !== undefined) patch.address = address;
  if (b.defaultLanguage === "en" || b.defaultLanguage === "ur") patch.defaultLanguage = b.defaultLanguage;
  const fee = str("consultationFee", 300);
  if (fee !== undefined) patch.consultationFee = fee;
  const prep = str("prepInstructions", 1500);
  if (prep !== undefined) patch.prepInstructions = prep;

  const tz = str("timezone");
  if (tz !== undefined) {
    if (!isValidTimezone(tz)) return NextResponse.json({ error: "Unknown timezone (use e.g. Asia/Kolkata)" }, { status: 400 });
    patch.timezone = tz;
  }
  for (const k of ["openTime", "closeTime"] as const) {
    const v = str(k);
    if (v !== undefined) {
      if (!TIME_RE.test(v)) return NextResponse.json({ error: "Times must be HH:MM" }, { status: 400 });
      patch[k] = v;
    }
  }
  if (patch.openTime && patch.closeTime && patch.openTime >= patch.closeTime) {
    return NextResponse.json({ error: "Closing time must be after opening time" }, { status: 400 });
  }
  if (Array.isArray(b.workDays)) {
    patch.workDays = (b.workDays as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  }
  if (typeof b.slotMinutes === "number") {
    if (b.slotMinutes < 10 || b.slotMinutes > 120) return NextResponse.json({ error: "Slot length must be 10–120 minutes" }, { status: 400 });
    patch.slotMinutes = Math.round(b.slotMinutes);
  }
  if (typeof b.autoReply === "boolean") patch.autoReply = b.autoReply;
  if (typeof b.autoConfirm === "boolean") patch.autoConfirm = b.autoConfirm;
  if (typeof b.allowTemplates === "boolean") patch.allowTemplates = b.allowTemplates;

  for (const k of ["templateReminderEn", "templateReminderUr", "templateUpdateEn", "templateUpdateUr"] as const) {
    const v = str(k, 512);
    if (v !== undefined) {
      if (!TEMPLATE_NAME_RE.test(v)) return NextResponse.json({ error: "Template names use only lowercase letters, digits and underscores" }, { status: 400 });
      patch[k] = v;
    }
  }
  for (const k of ["templateLangEn", "templateLangUr"] as const) {
    const v = str(k, 10);
    if (v !== undefined) {
      if (!TEMPLATE_LANG_RE.test(v)) return NextResponse.json({ error: "Template language must look like en, ur or en_US" }, { status: 400 });
      patch[k] = v;
    }
  }

  // secrets: only overwrite when a non-empty value is supplied
  for (const k of ["accessToken", "appSecret"] as const) {
    const v = str(k, 600);
    if (v) patch[k] = v;
  }
  if (b.clearAccessToken === true) patch.accessToken = "";
  if (b.rotateVerifyToken === true) patch.verifyToken = randomToken(12);

  const pin = str("pin", 32);
  if (b.removePin === true) patch.pinHash = "";
  else if (pin) {
    if (!/^\d{4,12}$/.test(pin)) return NextResponse.json({ error: "PIN must be 4–12 digits" }, { status: 400 });
    patch.pinHash = hashPin(pin);
  }

  await saveSettings(patch);
  return NextResponse.json({ settings: publicSettings(await getSettings()) });
}
