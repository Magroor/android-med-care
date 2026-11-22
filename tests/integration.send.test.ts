import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, runMigrations } from "../src/db";
import { appointments, messages, patients } from "../src/db/schema";
import { saveSettings } from "../src/lib/settings";
import { handleIncoming, queueOutgoing, dispatchPending, runMaintenance, setAppointmentStatus } from "../src/lib/service";

type Call = { url: string; body: any };
let calls: Call[] = [];
let seq = 0;
const okResponse = () => ({ status: 200, json: { messages: [{ id: `wamid.OK${++seq}` }] } });
let respond: () => { status: number; json: unknown } = okResponse;

const HOUR = 3600_000;

async function mkPatient(opts: { phone?: string; lang?: "ur" | "en"; lastInboundHoursAgo?: number | null }) {
  const [p] = await db
    .insert(patients)
    .values({ phone: opts.phone ?? "923001112233", name: "Ali", lang: opts.lang ?? "ur" })
    .returning();
  if (opts.lastInboundHoursAgo != null) {
    await db.insert(messages).values({
      patientId: p.id,
      direction: "in",
      body: "hello",
      status: "received",
      createdAt: new Date(Date.now() - opts.lastInboundHoursAgo * HOUR),
    });
  }
  return p;
}

async function mkAppt(patientId: number, inHours: number, status = "confirmed") {
  const [a] = await db
    .insert(appointments)
    .values({ patientId, startsAt: new Date(Date.now() + inHours * HOUR), status, patientConfirmed: true })
    .returning();
  return a;
}

const outMsgs = (patientId: number) => db.select().from(messages).where(eq(messages.patientId, patientId));

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  calls = [];
  respond = okResponse;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { body: string }) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) });
      const r = respond();
      return new Response(JSON.stringify(r.json), { status: r.status });
    }),
  );
  await db.delete(appointments);
  await db.delete(messages);
  await db.delete(patients);
  // connected to "Meta" with approved templates
  await saveSettings({
    phoneNumberId: "PHONE123",
    accessToken: "TOKEN",
    templateReminderUr: "appointment_reminder_ur",
    templateReminderEn: "appointment_reminder_en",
    templateUpdateUr: "appointment_update_ur",
    templateUpdateEn: "appointment_update_en",
    templateLangUr: "en",
    templateLangEn: "en",
    doctorName: "Dr. Waqas",
    timezone: "Asia/Karachi",
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("sending: inside vs outside the 24h window", () => {
  it("reminder outside the window is sent as the approved Roman Urdu template", async () => {
    const p = await mkPatient({ lastInboundHoursAgo: 30 });
    await mkAppt(p.id, 20);
    const r = await runMaintenance();
    expect(r.reminders).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/PHONE123/messages");
    expect(calls[0].body.type).toBe("template");
    expect(calls[0].body.to).toBe("923001112233");
    expect(calls[0].body.template.name).toBe("appointment_reminder_ur");
    expect(calls[0].body.template.language.code).toBe("en");
    const params = calls[0].body.template.components[0].parameters.map((x: { text: string }) => x.text);
    expect(params[0]).toBe("Dr. Waqas");
    expect(params[1]).toBe("consultation");
    expect(params[2]).toMatch(/\d/); // formatted date
    const m = (await outMsgs(p.id)).find((x) => x.direction === "out")!;
    expect(m.status).toBe("sent");
    expect(m.waMessageId).toMatch(/^wamid\.OK\d+$/);
    expect(m.body).toContain("Yaad dehani"); // thread still shows readable text
  });

  it("English patient gets the English template", async () => {
    const p = await mkPatient({ lang: "en", lastInboundHoursAgo: 30 });
    await mkAppt(p.id, 20);
    await runMaintenance();
    expect(calls[0].body.template.name).toBe("appointment_reminder_en");
  });

  it("reminder inside the window is plain text (free), not a template", async () => {
    const p = await mkPatient({ lastInboundHoursAgo: 1 });
    await mkAppt(p.id, 20);
    await runMaintenance();
    expect(calls).toHaveLength(1);
    expect(calls[0].body.type).toBe("text");
    expect(calls[0].body.text.body).toContain("Yaad dehani");
  });

  it("outside the window with NO template configured: fails fast, never calls Meta, never retries", async () => {
    await saveSettings({ templateReminderUr: "" });
    const p = await mkPatient({ lastInboundHoursAgo: 30 });
    await mkAppt(p.id, 20);
    await runMaintenance();
    expect(calls).toHaveLength(0);
    const m = (await outMsgs(p.id))[1] ?? (await outMsgs(p.id)).find((x) => x.direction === "out")!;
    const out = (await outMsgs(p.id)).find((x) => x.direction === "out")!;
    expect(out.status).toBe("failed");
    expect(out.lastError).toContain("no approved template");
    expect(out.attempts).toBe(1);
    expect(m).toBeTruthy();
    await runMaintenance(); // a second tick must not retry
    expect(calls).toHaveLength(0);
  });

  it("patient who never wrote (e.g. booked by the doctor) still gets the reminder via template", async () => {
    const p = await mkPatient({ lastInboundHoursAgo: null });
    await mkAppt(p.id, 20);
    await runMaintenance();
    expect(calls[0].body.type).toBe("template");
  });

  it("doctor's manual free-text reply outside the window fails clearly instead of hitting Meta", async () => {
    const p = await mkPatient({ lastInboundHoursAgo: 48 });
    const row = await queueOutgoing(p.id, "Aap kal aa jayein", "doctor");
    await dispatchPending();
    expect(calls).toHaveLength(0);
    const [m] = await db.select().from(messages).where(eq(messages.id, row.id));
    expect(m.status).toBe("failed");
    expect(m.lastError).toContain("must message first");
  });

  it("doctor's manual reply inside the window is sent as text", async () => {
    const p = await mkPatient({ lastInboundHoursAgo: 2 });
    await queueOutgoing(p.id, "Aap kal aa jayein", "doctor");
    await dispatchPending();
    expect(calls[0].body.type).toBe("text");
    expect(calls[0].body.text.body).toBe("Aap kal aa jayein");
  });

  it("doctor confirms an appointment outside the window -> 'update' template in Roman Urdu", async () => {
    const p = await mkPatient({ lastInboundHoursAgo: 72 });
    const a = await mkAppt(p.id, 30, "pending");
    await setAppointmentStatus(a.id, "confirmed");
    expect(calls).toHaveLength(1);
    expect(calls[0].body.template.name).toBe("appointment_update_ur");
    const params = calls[0].body.template.components[0].parameters.map((x: { text: string }) => x.text);
    expect(params[0]).toBe("Dr. Waqas");
    expect(params[2]).toBe("confirm ho gayi hai");
  });

  it("doctor cancels an appointment outside the window -> update template says cancelled", async () => {
    const p = await mkPatient({ lang: "en", lastInboundHoursAgo: 72 });
    const a = await mkAppt(p.id, 30);
    await setAppointmentStatus(a.id, "cancelled");
    expect(calls[0].body.template.name).toBe("appointment_update_en");
    expect(calls[0].body.template.components[0].parameters[2].text).toBe("cancelled");
  });

  it("a normal patient chat reply (always inside the window) is plain text", async () => {
    await handleIncoming({ phone: "923007654321", text: "AJ clinic khula h y ni", source: "whatsapp" });
    expect(calls).toHaveLength(1);
    expect(calls[0].body.type).toBe("text");
    expect(calls[0].body.text.body).toMatch(/Clinic abhi (khula|band) hai/);
  });
});

describe("Meta errors", () => {
  it("template rejected by Meta (132001 does not exist) -> failed, no retry storm", async () => {
    respond = () => ({ status: 400, json: { error: { code: 132001, message: "Template name does not exist in the translation" } } });
    const p = await mkPatient({ lastInboundHoursAgo: 30 });
    await mkAppt(p.id, 20);
    await runMaintenance();
    const out = (await outMsgs(p.id)).find((x) => x.direction === "out")!;
    expect(out.status).toBe("failed");
    expect(out.lastError).toContain("132001");
    await runMaintenance();
    expect(calls).toHaveLength(1);
  });

  it("Meta 500 -> requeued with backoff (retryable)", async () => {
    respond = () => ({ status: 500, json: { error: { message: "boom" } } });
    const p = await mkPatient({ lastInboundHoursAgo: 30 });
    await mkAppt(p.id, 20);
    await runMaintenance();
    const out = (await outMsgs(p.id)).find((x) => x.direction === "out")!;
    expect(out.status).toBe("queued");
    expect(out.attempts).toBe(1);
    expect(out.nextAttemptAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("window-closed error from Meta on a text (131047) is permanent", async () => {
    respond = () => ({ status: 400, json: { error: { code: 131047, message: "Re-engagement message" } } });
    const p = await mkPatient({ lastInboundHoursAgo: 1 }); // we think we're inside the window, Meta disagrees
    await queueOutgoing(p.id, "hi", "doctor");
    await dispatchPending();
    const out = (await outMsgs(p.id)).find((x) => x.direction === "out")!;
    expect(out.status).toBe("failed");
  });
});

describe("simulator mode (no WhatsApp credentials)", () => {
  it("never calls Meta and never needs templates, even outside the window", async () => {
    await saveSettings({ phoneNumberId: "", accessToken: "" });
    const p = await mkPatient({ lastInboundHoursAgo: 90 });
    await mkAppt(p.id, 20);
    await runMaintenance();
    expect(calls).toHaveLength(0);
    const out = (await outMsgs(p.id)).find((x) => x.direction === "out")!;
    expect(out.status).toBe("simulated");
  });
});

describe("reminder bookkeeping", () => {
  it("each reminder is queued once (24h then 2h), not on every tick", async () => {
    const p = await mkPatient({ lastInboundHoursAgo: 30 });
    const a = await mkAppt(p.id, 20);
    await runMaintenance();
    await runMaintenance();
    expect(calls).toHaveLength(1);
    await db.update(appointments).set({ startsAt: new Date(Date.now() + 1 * HOUR) }).where(eq(appointments.id, a.id));
    await runMaintenance();
    expect(calls).toHaveLength(2);
    await runMaintenance();
    expect(calls).toHaveLength(2);
  });

  it("cancelled appointments get no reminder", async () => {
    const p = await mkPatient({ lastInboundHoursAgo: 30 });
    await mkAppt(p.id, 20, "cancelled");
    await runMaintenance();
    expect(calls).toHaveLength(0);
  });
});
