import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { asc, eq } from "drizzle-orm";
import { db, runMigrations } from "../src/db";
import { appointments, clinicalNotes, messages, patients } from "../src/db/schema";
import { saveSettings } from "../src/lib/settings";
import { dispatchPending, handleIncoming, queueOutgoing, runMaintenance } from "../src/lib/service";
import { classify } from "../src/lib/intent";
import { redactSensitive } from "../src/lib/privacy";

const HOUR = 3600_000;
let calls: { body: any }[] = [];
let seq = 0;

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_u: string, init: { body: string }) => {
      calls.push({ body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ messages: [{ id: `wamid.C${++seq}` }] }), { status: 200 });
    }),
  );
  await db.delete(appointments);
  await db.delete(clinicalNotes);
  await db.delete(messages);
  await db.delete(patients);
  await saveSettings({ phoneNumberId: "", accessToken: "", templateReminderUr: "appointment_reminder_ur", doctorName: "Dr. Waqas", timezone: "Asia/Karachi" });
});
afterEach(() => vi.unstubAllGlobals());

const say = (phone: string, text: string) => handleIncoming({ phone, text, source: "simulator" });
const thread = async (phone: string) => {
  const [p] = await db.select().from(patients).where(eq(patients.phone, phone));
  const rows = await db.select().from(messages).where(eq(messages.patientId, p.id)).orderBy(asc(messages.id));
  return { p, rows, out: rows.filter((r) => r.direction === "out") };
};

describe("STOP / START (opt-out handling)", () => {
  it.each([
    "STOP", "stop", "Stop all", "unsubscribe", "opt out", "band karo", "Band kar do", "mat bhejo", "mat bhejein", "messages band karo", "بند کریں", "روکیں",
  ])("%s is an opt-out", (t) => expect(classify(t).intent).toBe("optout"));

  it.each(["START", "start", "subscribe", "resume", "shuru", "dobara shuru", "شروع"])("%s is an opt-in", (t) => expect(classify(t).intent).toBe("optin"));

  it("words that merely contain stop/band do not opt out", () => {
    for (const t of ["bus stop kahan hai", "I need to stop taking this tablet", "clinic band hai kya"]) expect(classify(t).intent, t).not.toBe("optout");
  });

  it("STOP confirms once, records the opt-out, and silences further automation", async () => {
    await say("923001000001", "Assalamualaikum");
    await say("923001000001", "STOP");
    let t = await thread("923001000001");
    expect(t.p.optedOut).toBe(true);
    expect(t.out[t.out.length - 1].body).toContain("koi paigham");
    const before = t.out.length;
    await say("923001000001", "fees kitni hai"); // no auto reply while opted out
    await say("923001000001", "kal 10 bje appointment");
    t = await thread("923001000001");
    expect(t.out.length).toBe(before);
    expect(t.rows.filter((r) => r.direction === "in")).toHaveLength(4); // still logged for the doctor
  });

  it("emergencies still get the safety reply after STOP", async () => {
    await say("923001000002", "STOP");
    await say("923001000002", "seene mein dard hai");
    const t = await thread("923001000002");
    expect(t.out[t.out.length - 1].body).toContain("1122");
  });

  it("START resumes replies", async () => {
    await say("923001000003", "STOP");
    await say("923001000003", "START");
    const t = await thread("923001000003");
    expect(t.p.optedOut).toBe(false);
    expect(t.out[t.out.length - 1].body).toContain("Khush aamdeed");
    const n = t.out.length;
    await say("923001000003", "fees kitni hai");
    expect((await thread("923001000003")).out.length).toBe(n + 1);
  });

  it("STOP in English is answered in English", async () => {
    await say("923001000004", "Hello, I need to book an appointment please");
    await say("923001000004", "STOP");
    const t = await thread("923001000004");
    expect(t.out[t.out.length - 1].body).toContain("no longer receive messages");
  });

  it("no reminders and no doctor messages reach an opted-out patient", async () => {
    await say("923001000005", "Assalamualaikum");
    await say("923001000005", "STOP");
    const { p } = await thread("923001000005");
    await db.insert(appointments).values({ patientId: p.id, startsAt: new Date(Date.now() + 20 * HOUR), status: "confirmed", patientConfirmed: true });
    const r = await runMaintenance();
    expect(r.reminders).toBe(0);
    const row = await queueOutgoing(p.id, "Aap kal aa jayein", "doctor");
    await dispatchPending();
    const [m] = await db.select().from(messages).where(eq(messages.id, row.id));
    expect(m.status).toBe("failed");
    expect(m.lastError).toContain("opted out");
  });

  it("STOP works even when auto-reply is switched off", async () => {
    await saveSettings({ autoReply: false });
    await say("923001000006", "STOP");
    const t = await thread("923001000006");
    expect(t.p.optedOut).toBe(true);
    expect(t.out.length).toBe(1);
    await saveSettings({ autoReply: true });
  });
});

describe("consent / privacy notice", () => {
  it("is attached to the first reply only", async () => {
    await say("923001000010", "Assalamualaikum");
    await say("923001000010", "fees kitni hai");
    const { out, p } = await thread("923001000010");
    expect(out[0].body).toContain("STOP");
    expect(out[0].body).toContain("🔒");
    expect(out[1].body).not.toContain("🔒");
    expect(p.consentAt).not.toBeNull();
  });
  it("is not attached to an emergency reply, but to the next normal one", async () => {
    await say("923001000011", "saans nahi aa rahi");
    let t = await thread("923001000011");
    expect(t.out[0].body).not.toContain("🔒");
    await say("923001000011", "fees kitni hai");
    t = await thread("923001000011");
    expect(t.out[1].body).toContain("🔒");
  });
  it("English patients get the English notice", async () => {
    await say("923001000012", "What are your clinic hours please?");
    expect((await thread("923001000012")).out[0].body).toContain("you agree to receive replies");
  });
});

describe("sensitive identifiers are never stored", () => {
  it.each([
    ["my cnic is 35202-1234567-1", "[ID number removed]"],
    ["cnic 3520212345671 hai", "[ID number removed]"],
    ["card 4111 1111 1111 1111 hai", "[card number removed]"],
    ["4111-1111-1111-1111", "[card number removed]"],
    ["iban PK36SCBL0000001123456702", "[account number removed]"],
    ["میرا شناختی کارڈ 35202-1234567-1 ہے", "[ID number removed]"],
  ])("%s", (text, marker) => {
    const r = redactSensitive(text);
    expect(r.redacted).toBe(true);
    expect(r.text).toContain(marker);
    expect(r.text).not.toMatch(/35202|4111|SCBL|3520212345671/);
  });

  it("does not touch phone numbers, dates, times, amounts, or short numbers", () => {
    for (const t of ["mera number 0300 1234567 hai", "+92 300 1234567", "923001234567", "0092 300 1234567", "fees 1500 rupay", "kal 10:30 bje", "15/06/2025", "order 4111", "appointment 2 june 2025 at 4pm"]) {
      expect(redactSensitive(t), t).toEqual({ text: t, redacted: false });
    }
  });

  it("a card-like number that fails the Luhn check is left alone", () => {
    expect(redactSensitive("1234 5678 9012 3456").redacted).toBe(false);
  });

  it("redacts before storage, warns the patient, and still answers the question", async () => {
    await say("923001000020", "fees kitni hai, mera cnic 35202-1234567-1 hai");
    const t = await thread("923001000020");
    const incoming = t.rows.find((r) => r.direction === "in")!;
    expect(incoming.body).toContain("[ID number removed]");
    expect(incoming.body).not.toContain("35202");
    expect(t.out[0].body).toMatch(/consultation fees/i); // question still answered (Roman Urdu)
    expect(t.out[t.out.length - 1].body).toContain("shanakhti");
    expect(JSON.stringify(t.rows)).not.toContain("1234567-1");
  });
});

describe("talk to a human (escalation path)", () => {
  it.each([
    "I want to talk to a human", "human please", "real person", "receptionist se baat karni hai", "doctor se baat karni hai", "staff se baat karwa dein", "call me please", "insaan se baat karni hai",
    "عملہ سے بات کرنی ہے",
  ])("%s -> human", (t) => expect(classify(t).intent).toBe("human"));

  it("booking sentences that mention 'baat' are still bookings", () => {
    expect(classify("doctor se baat karni hai, appointment chahiye").intent).toBe("booking");
  });

  it("replies with a hand-off message and flags the thread for review", async () => {
    const r = await say("923001000030", "receptionist se baat karni hai");
    expect(r).toMatchObject({ intent: "human" });
    const { out } = await thread("923001000030");
    expect(out[0].body).toContain("team ko ittila");
  });
});

describe("patient data deletion", () => {
  it("deleting a patient cascades to chats, appointments and notes", async () => {
    await say("923001000040", "kal 10 bje appointment");
    const { p } = await thread("923001000040");
    await db.insert(clinicalNotes).values({ patientId: p.id, body: "note" });
    await db.delete(patients).where(eq(patients.id, p.id));
    expect(await db.select().from(messages).where(eq(messages.patientId, p.id))).toHaveLength(0);
    expect(await db.select().from(clinicalNotes).where(eq(clinicalNotes.patientId, p.id))).toHaveLength(0);
    expect(await db.select().from(appointments).where(eq(appointments.patientId, p.id))).toHaveLength(0);
  });
});

describe("clinic phone in hand-off replies", () => {
  it("shows the clinic phone when configured (Roman Urdu and English), nothing when empty", async () => {
    await saveSettings({ clinicPhone: "+92 331 9758081" });
    await say("923001000050", "receptionist se baat karni hai");
    await say("923001000051", "I want to talk to a human please");
    const ur = (await thread("923001000050")).out[0].body;
    const en = (await thread("923001000051")).out[0].body;
    expect(ur).toContain("+92 331 9758081 par call");
    expect(en).toContain("call the clinic on +92 331 9758081");
    await saveSettings({ clinicPhone: "" });
    await say("923001000052", "receptionist se baat karni hai");
    expect((await thread("923001000052")).out[0].body).not.toContain("par call bhi");
  });
});
