import { describe, expect, it } from "vitest";
import { decide, DISCLAIMER, type DecideInput, type EngineSettings, type PendingState } from "../src/lib/engine";
import { zonedToUtc } from "../src/lib/time";

const settings: EngineSettings = {
  timezone: "Asia/Kolkata",
  openTime: "09:00",
  closeTime: "17:00",
  workDays: [1, 2, 3, 4, 5],
  slotMinutes: 30,
  clinicName: "City Care Clinic",
  doctorName: "Dr. Sharma",
  emergencyNumber: "112",
  address: "12 Park Street",
  prepInstructions: "Bring ID.",
  autoConfirm: true,
};
const NOW = new Date("2025-06-02T06:00:00Z"); // Mon 11:30 IST (open)
const NIGHT = new Date("2025-06-02T16:30:00Z"); // Mon 22:00 IST (closed)
const at = (d: number, h: number, m = 0) => zonedToUtc(2025, 6, d, h, m, settings.timezone);

function run(text: string, over: Partial<DecideInput> = {}) {
  return decide({ text, now: NOW, settings, patientName: "Asha", pending: null, upcoming: [], busy: [], ...over });
}

describe("emergency escalation", () => {
  it("urgent reply tells the patient to call emergency services and flags the message", () => {
    const d = run("severe chest pain and can't breathe");
    expect(d.intent).toBe("emergency");
    expect(d.urgent).toBe(true);
    expect(d.replies[0]).toContain("112");
    expect(d.replies[0]).toContain(DISCLAIMER);
    expect(d.actions).toEqual([]); // never starts a booking flow
  });

  it("still escalates after hours (no 'we are closed' noise)", () => {
    const d = run("heavy bleeding", { now: NIGHT });
    expect(d.urgent).toBe(true);
    expect(d.replies).toHaveLength(1);
  });
});

describe("booking flow", () => {
  it("proposes an exact free slot and waits for YES", () => {
    const d = run("book an appointment tomorrow at 10am");
    expect(d.intent).toBe("booking");
    const set = d.actions.find((a) => a.type === "setPending");
    expect(set).toBeTruthy();
    expect(set!.type === "setPending" && set!.pending.options).toEqual([at(3, 10).toISOString()]);
    expect(d.replies[0]).toMatch(/Reply YES/);
    expect(d.actions.some((a) => a.type === "book")).toBe(false); // not booked until confirmed
  });

  it("books when the patient replies YES", () => {
    const pending: PendingState = { options: [at(3, 10).toISOString()], consultType: "consultation" };
    const d = run("yes", { pending });
    const book = d.actions.find((a) => a.type === "book");
    expect(book).toMatchObject({ type: "book", status: "confirmed" });
    expect(d.replies[0]).toContain("Confirmed");
    expect(d.actions.some((a) => a.type === "clearPending")).toBe(true);
  });

  it("creates a pending request when auto-confirm is off", () => {
    const pending: PendingState = { options: [at(3, 10).toISOString()], consultType: "consultation" };
    const d = run("yes", { pending, settings: { ...settings, autoConfirm: false } });
    expect(d.actions.find((a) => a.type === "book")).toMatchObject({ status: "pending" });
  });

  it("offers alternatives when the requested slot is taken", () => {
    const d = run("appointment tomorrow 10am", { busy: [{ id: 9, startsAt: at(3, 10), durationMin: 30 }] });
    expect(d.replies[0]).toContain("already taken");
    const set = d.actions.find((a) => a.type === "setPending");
    expect(set && set.type === "setPending" && set.pending.options).not.toContain(at(3, 10).toISOString());
    expect(set && set.type === "setPending" && set.pending.options.length).toBeGreaterThan(1);
  });

  it("refuses to double-book a slot that was taken between offer and confirmation", () => {
    const pending: PendingState = { options: [at(3, 10).toISOString()], consultType: "consultation" };
    const d = run("yes", { pending, busy: [{ id: 5, startsAt: at(3, 10), durationMin: 30 }] });
    expect(d.actions.some((a) => a.type === "book")).toBe(false);
    expect(d.replies[0]).toContain("already taken");
  });

  it("lists free slots for a date only and lets the patient choose by number", () => {
    const d = run("anything on friday morning?");
    const set = d.actions.find((a) => a.type === "setPending");
    expect(set && set.type === "setPending" && set.pending.options.length).toBeGreaterThan(1);
    const options = set!.type === "setPending" ? set!.pending.options : [];
    const picked = run("2", { pending: { options, consultType: "consultation" } });
    expect(picked.actions.find((a) => a.type === "book")).toMatchObject({ start: new Date(options[1]) });
  });

  it("rejects out-of-range option numbers", () => {
    const d = run("9", { pending: { options: [at(3, 10).toISOString()], consultType: "consultation" } });
    expect(d.actions.some((a) => a.type === "book")).toBe(false);
    expect(d.replies[0]).toContain("between 1 and 1");
  });

  it("treats a bare date/time as a booking answer", () => {
    expect(run("tomorrow 11am").intent).toBe("booking");
  });
});

describe("reschedule / cancel / reminders", () => {
  const upcoming = [{ id: 42, startsAt: at(4, 11), durationMin: 30, status: "confirmed", patientConfirmed: false, consultType: "consultation" }];

  it("cancels the next appointment", () => {
    const d = run("cancel", { upcoming });
    expect(d.actions).toContainEqual({ type: "cancel", id: 42 });
  });

  it("reschedule offers slots that free the old appointment", () => {
    const d = run("reschedule please", { upcoming, busy: [{ id: 42, startsAt: at(4, 11), durationMin: 30 }] });
    const set = d.actions.find((a) => a.type === "setPending");
    expect(set && set.type === "setPending" && set.pending.replaceId).toBe(42);
  });

  it("rescheduling into the old slot itself is allowed", () => {
    const d = run("reschedule to wednesday 11am", { upcoming, busy: [{ id: 42, startsAt: at(4, 11), durationMin: 30 }] });
    expect(d.replies[0]).toContain("Reply YES");
  });

  it("CONFIRM after a reminder marks the patient as confirmed", () => {
    const d = run("confirm", { upcoming });
    expect(d.actions).toContainEqual({ type: "patientConfirm", id: 42 });
  });

  it("cancelling without an appointment is handled gracefully", () => {
    expect(run("cancel").replies[0]).toContain("couldn't find");
  });
});

describe("out-of-hours auto-responder and guardrails", () => {
  it("prepends clinic hours + emergency number after hours but still answers", () => {
    const d = run("book an appointment", { now: NIGHT });
    expect(d.replies[0]).toContain("currently closed");
    expect(d.replies[0]).toContain("Mon–Fri");
    expect(d.replies[0]).toContain("112");
    expect(d.replies).toHaveLength(1); // single message: notice + answer
    expect(d.replies[0]).toMatch(/available times|Reply YES|couldn't find a free slot/);
  });

  it("does not repeat the closed notice mid-booking", () => {
    const pending: PendingState = { options: [at(3, 10).toISOString()], consultType: "consultation" };
    expect(run("yes", { pending, now: NIGHT }).replies[0]).not.toContain("currently closed");
  });

  it("adds the disclaimer to medical guidance replies", () => {
    for (const text of ["I have a fever and headache", "when should I take my medicine", "how do I prepare for the test"]) {
      expect(run(text).replies.join("\n")).toContain("not a medical diagnosis");
    }
  });

  it("flags unknown messages for staff review", () => {
    const d = run("asdf qwerty");
    expect(d.needsReview).toBe(true);
    expect(d.replies.join("\n")).toContain(DISCLAIMER);
  });

  it("answers FAQs", () => {
    expect(run("where is the clinic located?").replies[0]).toContain("12 Park Street");
    expect(run("what are your timings").replies[0]).toContain("Mon–Fri");
  });
});
