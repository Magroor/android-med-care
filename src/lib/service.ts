import { and, asc, eq, gt, inArray, lt, lte, or, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, messages, patients } from "@/db/schema";
import { decide, type Action, type EngineSettings, type PendingState } from "./engine";
import { overlaps } from "./scheduling";
import { sendPushToAll } from "./push";
import { isLang, msgs, resolveLang, type Lang } from "./lang";
import { getSettings, type Settings } from "./settings";
import { formatSlot } from "./time";
import { backoffSeconds, MAX_SEND_ATTEMPTS, sendWhatsAppText } from "./whatsapp";

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function toEngineSettings(s: Settings): EngineSettings {
  return {
    timezone: s.timezone,
    openTime: s.openTime,
    closeTime: s.closeTime,
    workDays: s.workDays,
    slotMinutes: s.slotMinutes,
    clinicName: s.clinicName,
    doctorName: s.doctorName,
    emergencyNumber: s.emergencyNumber,
    address: s.address,
    prepInstructions: s.prepInstructions,
    consultationFee: s.consultationFee,
    autoConfirm: s.autoConfirm,
  };
}

const ACTIVE = ["pending", "confirmed"] as const;

function langFor(patientLang: string | null | undefined, s: Settings): Lang {
  return isLang(patientLang) ? patientLang : s.defaultLanguage;
}

export async function queueOutgoing(
  patientId: number,
  body: string,
  source: "auto" | "doctor" | "reminder" | "simulator" = "auto",
  extra: { intent?: string | null } = {},
) {
  const [row] = await db
    .insert(messages)
    .values({
      patientId,
      direction: "out",
      body,
      source,
      intent: extra.intent ?? null,
      status: "queued",
      read: true,
    })
    .returning();
  await db.update(patients).set({ lastMessageAt: new Date() }).where(eq(patients.id, patientId));
  return row;
}

/** Send queued messages. Uses row claiming so concurrent workers never double-send. */
export async function dispatchPending(limit = 25) {
  const now = new Date();
  const due = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.direction, "out"),
        eq(messages.status, "queued"),
        or(isNull(messages.nextAttemptAt), lte(messages.nextAttemptAt, now)),
      ),
    )
    .orderBy(asc(messages.id))
    .limit(limit);
  if (due.length === 0) return 0;

  const settings = await getSettings();
  let sent = 0;
  for (const { id } of due) {
    const [claimed] = await db
      .update(messages)
      .set({ status: "sending", nextAttemptAt: new Date() })
      .where(and(eq(messages.id, id), eq(messages.status, "queued")))
      .returning();
    if (!claimed) continue;
    const [patient] = await db.select().from(patients).where(eq(patients.id, claimed.patientId));
    if (!patient) continue;

    const res = await sendWhatsAppText(
      { phoneNumberId: settings.phoneNumberId, accessToken: settings.accessToken },
      patient.phone,
      claimed.body,
    );
    if (res.ok) {
      await db
        .update(messages)
        .set({
          status: res.simulated ? "simulated" : "sent",
          waMessageId: res.id ?? null,
          lastError: null,
          attempts: claimed.attempts + 1,
        })
        .where(eq(messages.id, id));
      sent++;
    } else {
      const attempts = claimed.attempts + 1;
      const giveUp = !res.retryable || attempts >= MAX_SEND_ATTEMPTS;
      await db
        .update(messages)
        .set({
          status: giveUp ? "failed" : "queued",
          attempts,
          lastError: res.error,
          nextAttemptAt: new Date(Date.now() + backoffSeconds(attempts) * 1000),
        })
        .where(eq(messages.id, id));
    }
  }
  return sent;
}

export type IncomingInput = {
  phone: string;
  name?: string;
  text: string;
  waMessageId?: string;
  source?: "whatsapp" | "simulator";
  unsupportedType?: string;
};

export async function handleIncoming(input: IncomingInput) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Invalid phone number");
  const source = input.source ?? "whatsapp";

  if (input.waMessageId) {
    const dup = await db.select({ id: messages.id }).from(messages).where(eq(messages.waMessageId, input.waMessageId)).limit(1);
    if (dup.length) return { duplicate: true as const };
  }

  const settings = await getSettings();
  const now = new Date();

  // upsert patient
  let [patient] = await db.select().from(patients).where(eq(patients.phone, phone));
  if (!patient) {
    [patient] = await db
      .insert(patients)
      .values({ phone, name: input.name?.trim() || null })
      .onConflictDoNothing()
      .returning();
    if (!patient) [patient] = await db.select().from(patients).where(eq(patients.phone, phone));
  } else if (!patient.name && input.name?.trim()) {
    await db.update(patients).set({ name: input.name.trim() }).where(eq(patients.id, patient.id));
    patient = { ...patient, name: input.name.trim() };
  }

  const bodyText = input.text || (input.unsupportedType ? `[${input.unsupportedType} message]` : "");

  let incoming;
  try {
    [incoming] = await db
      .insert(messages)
      .values({
        patientId: patient.id,
        direction: "in",
        body: bodyText,
        source,
        waMessageId: input.waMessageId ?? null,
        status: "received",
        read: false,
      })
      .returning();
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { duplicate: true as const }; // concurrent redelivery
    throw e;
  }
  // language: detect per message (English / Roman Urdu); remember it for reminders & doctor messages
  const { lang, remember } = resolveLang(input.text, isLang(patient.lang) ? patient.lang : null, settings.defaultLanguage);
  await db
    .update(patients)
    .set({ lastMessageAt: now, ...(remember && remember !== patient.lang ? { lang: remember } : {}) })
    .where(eq(patients.id, patient.id));

  if (input.unsupportedType) {
    await queueOutgoing(
      patient.id,
      msgs(lang).unsupported,
      "auto",
    );
    await safeDispatch();
    return { duplicate: false as const, patientId: patient.id, intent: "unsupported", urgent: false, replies: 1 };
  }

  const engineSettings = toEngineSettings(settings);

  // conversation state
  let pending: PendingState | null = null;
  if (patient.pendingJson && patient.pendingExpiresAt && patient.pendingExpiresAt > now) {
    try {
      pending = JSON.parse(patient.pendingJson) as PendingState;
    } catch {
      pending = null;
    }
  }
  const upcoming = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.patientId, patient.id), gt(appointments.startsAt, now), inArray(appointments.status, [...ACTIVE])))
    .orderBy(asc(appointments.startsAt));
  const busy = await loadBusy(now);

  const decision = decide({
    lang,
    text: input.text,
    now,
    settings: engineSettings,
    patientName: patient.name,
    pending,
    upcoming,
    busy,
  });

  await db
    .update(messages)
    .set({ intent: decision.intent, urgent: decision.urgent })
    .where(eq(messages.id, incoming.id));
  await db.update(patients).set({ lastIntent: decision.intent }).where(eq(patients.id, patient.id));

  // Native push to the doctor's phone (PWA). Awaited so serverless doesn't kill it; never throws.
  if (decision.urgent) {
    await sendPushToAll({
      title: "🚨 Urgent patient message",
      body: "Open MedAssist to review",
      tag: `urgent-${incoming.id}`,
      url: `/patients/${patient.id}`,
    });
  } else if (decision.actions.some((a) => a.type === "book" && a.status === "pending")) {
    await sendPushToAll({ title: "📅 Booking needs approval", body: "A patient requested an appointment", tag: `booking-${incoming.id}`, url: "/appointments" });
  }

  let replies = decision.replies;
  if (settings.autoReply || decision.urgent) {
    // urgent messages always get the safety reply, even if auto-reply is switched off
    const applied = await applyActions(patient.id, decision.actions, engineSettings);
    if (applied.conflict) {
      // lost a race for the slot: replace the confirmation with an apology
      replies = [
        "Sorry — that slot was just taken by someone else. Reply BOOK and I'll show the next available times.",
      ];
    }
    if (!settings.autoReply) replies = decision.urgent ? replies : [];
    for (const r of replies) await queueOutgoing(patient.id, r, "auto", { intent: decision.intent });
    await safeDispatch();
  }

  return {
    duplicate: false as const,
    patientId: patient.id,
    intent: decision.intent,
    urgent: decision.urgent,
    replies: replies.length,
  };
}

async function safeDispatch() {
  try {
    await dispatchPending();
  } catch (e) {
    console.error("dispatchPending failed", e);
  }
}

export async function loadBusy(now: Date) {
  const rows = await db
    .select()
    .from(appointments)
    .where(and(gt(appointments.startsAt, new Date(now.getTime() - 24 * 3600 * 1000)), inArray(appointments.status, [...ACTIVE])));
  return rows.map((r) => ({ id: r.id, startsAt: r.startsAt, durationMin: r.durationMin }));
}

async function applyActions(patientId: number, actions: Action[], s: EngineSettings): Promise<{ conflict: boolean }> {
  let conflict = false;
  for (const a of actions) {
    switch (a.type) {
      case "setPending":
        await db
          .update(patients)
          .set({ pendingJson: JSON.stringify(a.pending), pendingExpiresAt: new Date(Date.now() + 60 * 60 * 1000) })
          .where(eq(patients.id, patientId));
        break;
      case "clearPending":
        await db.update(patients).set({ pendingJson: null, pendingExpiresAt: null }).where(eq(patients.id, patientId));
        break;
      case "cancel":
        await db.update(appointments).set({ status: "cancelled" }).where(and(eq(appointments.id, a.id), eq(appointments.patientId, patientId)));
        break;
      case "patientConfirm":
        await db.update(appointments).set({ patientConfirmed: true }).where(and(eq(appointments.id, a.id), eq(appointments.patientId, patientId)));
        break;
      case "book": {
        const ok = await bookSlot(patientId, a, s);
        if (!ok) conflict = true;
        break;
      }
    }
  }
  return { conflict };
}

/** Book inside a transaction guarded by an advisory lock so two patients can never take the same slot. */
async function bookSlot(
  patientId: number,
  a: Extract<Action, { type: "book" }>,
  s: EngineSettings,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(7701)`);
    const rows = await tx
      .select()
      .from(appointments)
      .where(and(inArray(appointments.status, [...ACTIVE]), gt(appointments.startsAt, new Date(a.start.getTime() - 24 * 3600 * 1000))));
    const others = rows.filter((r) => r.id !== a.replaceId);
    if (overlaps(a.start, s.slotMinutes, others)) return false;

    if (a.replaceId) {
      await tx
        .update(appointments)
        .set({ status: "cancelled" })
        .where(and(eq(appointments.id, a.replaceId), eq(appointments.patientId, patientId)));
    }
    const hoursAway = (a.start.getTime() - Date.now()) / 3600_000;
    await tx.insert(appointments).values({
      patientId,
      startsAt: a.start,
      durationMin: s.slotMinutes,
      consultType: a.consultType,
      status: a.status,
      patientConfirmed: a.status === "confirmed",
      // don't send "24h" / "2h" reminders for bookings made inside those windows
      reminder24Sent: hoursAway <= 24,
      reminder2Sent: hoursAway <= 2,
    });
    return true;
  });
}

/** Doctor approves / changes an appointment from the dashboard. Notifies the patient. */
export async function setAppointmentStatus(id: number, status: "confirmed" | "cancelled" | "completed" | "no_show" | "pending") {
  const [appt] = await db.update(appointments).set({ status, ...(status === "confirmed" ? { patientConfirmed: true } : {}) }).where(eq(appointments.id, id)).returning();
  if (!appt) return null;
  const s = await getSettings();
  const [pt] = await db.select({ lang: patients.lang }).from(patients).where(eq(patients.id, appt.patientId));
  const plang = langFor(pt?.lang, s);
  if (status === "confirmed") {
    await queueOutgoing(appt.patientId, msgs(plang).doctorConfirmed(appt.consultType, s.doctorName, formatSlot(appt.startsAt, s.timezone)), "doctor");
  } else if (status === "cancelled") {
    await queueOutgoing(appt.patientId, msgs(plang).doctorCancelled(formatSlot(appt.startsAt, s.timezone)), "doctor");
  }
  await safeDispatch();
  return appt;
}

/** Background maintenance: unstick claims, send 24h/2h reminders, dispatch queue with backoff. */
export async function runMaintenance() {
  const now = new Date();
  // messages stuck in 'sending' (process crashed mid-send) go back to the queue
  await db
    .update(messages)
    .set({ status: "queued" })
    .where(and(eq(messages.status, "sending"), lt(messages.nextAttemptAt, new Date(now.getTime() - 2 * 60 * 1000))));

  const settings = await getSettings();
  const horizon = new Date(now.getTime() + 24 * 3600 * 1000);
  const rows = await db
    .select({ appt: appointments, patient: patients })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(and(eq(appointments.status, "confirmed"), gt(appointments.startsAt, now), lte(appointments.startsAt, horizon)));

  let reminders = 0;
  for (const { appt, patient } of rows) {
    const M = msgs(langFor(patient.lang, settings));
    const msUntil = appt.startsAt.getTime() - now.getTime();
    const when = formatSlot(appt.startsAt, settings.timezone);
    if (msUntil <= 2 * 3600_000 && !appt.reminder2Sent) {
      await db.update(appointments).set({ reminder2Sent: true, reminder24Sent: true }).where(eq(appointments.id, appt.id));
      await queueOutgoing(appt.patientId, M.reminder2(appt.consultType, settings.doctorName, when), "reminder", { intent: "reminder" });
      reminders++;
    } else if (msUntil > 2 * 3600_000 && !appt.reminder24Sent) {
      await db.update(appointments).set({ reminder24Sent: true }).where(eq(appointments.id, appt.id));
      await queueOutgoing(appt.patientId, M.reminder24(appt.consultType, settings.doctorName, when), "reminder", { intent: "reminder" });
      reminders++;
    }
  }
  const sent = await dispatchPending();
  return { reminders, sent };
}
