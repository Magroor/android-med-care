import { describe, expect, it } from "vitest";
import { decide, type DecideInput, type EngineSettings, type PendingState, type UpcomingAppt } from "../src/lib/engine";
import { detectLang, msgs } from "../src/lib/lang";
import { classify, detectEmergency, parseDateTime } from "../src/lib/intent";
import { formatSlot, zonedToUtc } from "../src/lib/time";

const settings: EngineSettings = {
  timezone: "Asia/Karachi",
  openTime: "09:00",
  closeTime: "17:00",
  workDays: [1, 2, 3, 4, 5, 6],
  slotMinutes: 30,
  clinicName: "Saeed Medicare Clinic",
  doctorName: "Dr. Waqas",
  emergencyNumber: "1122",
  address: "Dahranwala, Bahawalpur",
  prepInstructions: "Bring ID and old reports.",
  consultationFee: "Rs 1500 clinic, Rs 1000 online (JazzCash / Easypaisa)",
  autoConfirm: true,
};
const TZ = settings.timezone;
// Monday 2 June 2025, 11:30 Karachi (open)
const NOW = zonedToUtc(2025, 6, 2, 11, 30, TZ);
const NIGHT = zonedToUtc(2025, 6, 2, 22, 0, TZ);
const at = (d: number, h: number, m = 0) => zonedToUtc(2025, 6, d, h, m, TZ);

function run(text: string, over: Partial<DecideInput> = {}) {
  return decide({ text, now: NOW, settings, lang: "ur", patientName: null, pending: null, upcoming: [], busy: [], ...over });
}
const reply = (d: ReturnType<typeof run>) => d.replies.join("\n");
const appt = (over: Partial<UpcomingAppt> = {}): UpcomingAppt => ({
  id: 7, startsAt: at(3, 10), durationMin: 30, status: "confirmed", patientConfirmed: false, consultType: "consultation", ...over,
});

// ---------------------------------------------------------------------------------------------
describe("every message from the real clinic chats gets the right intent AND a Roman Urdu reply", () => {
  const chats: [string, string][] = [
    ["Assalamualaikum", "greeting"],
    ["Kitne bje Ayn ge clinic", "hours"],
    ["Ap Ayn hen clinic", "hours"],
    ["Ap 5 bje tk aa jyn ge sir", "hours"],
    ["AJ clinic h on?", "hours"],
    ["Asslamoalikum", "greeting"],
    ["AJ h clinic timing bta dn", "hours"],
    ["Assalam o alaikum", "greeting"],
    ["AJ clinic khula h y ni", "hours"],
    ["I'm Jawad", "unknown"],
    ["I need medical consultation", "booking"],
    ["Online consultation", "booking"],
    ["Doctor sahb are you available at clinic now?", "hours"],
    ["Hello sir", "greeting"],
    ["Thyroid ka pasant he app illaj karate ho", "symptoms"],
    ["Aye ni ap clinic", "hours"],
    ["Location of the clinic", "location"],
    ["I need to book an appointment", "booking"],
    ["Anytime for today or tomorrow ? I have meetings at 6 pm", "booking"],
    ["Dr sab ap ny aj Kitne bjy bethna hy bwp", "hours"],
    ["Do you also provide online consultation?", "booking"],
    ["Thank you for reply ...", "thanks"],
    ["How can an online appointment be booked?", "booking"],
    ["What is the consultation fee and payment method?", "fee"],
    ["And what are the available time slots?", "booking"],
    ["Doctor consultation fee", "fee"],
    ["Dr sahib Suba ka time mil jay ga dahranwala se ana hy check karwany", "booking"],
  ];
  it.each(chats)("%s -> %s", (text, intent) => {
    const d = run(text, { lang: detectLang(text) ?? "ur" });
    expect(d.intent).toBe(intent);
    expect(d.replies.length).toBeGreaterThan(0);
    for (const r of d.replies) expect(r.length).toBeGreaterThan(10);
  });

  it("Roman Urdu messages are answered in Roman Urdu, English in English", () => {
    expect(reply(run("AJ clinic khula h y ni", { lang: "ur" }))).toMatch(/Clinic abhi (khula|band) hai/);
    expect(reply(run("Location of the clinic", { lang: "en" }))).toContain("Hours:");
    expect(reply(run("Doctor consultation fee", { lang: "ur" }))).toContain("Consultation fees aur payment");
    expect(reply(run("Doctor consultation fee", { lang: "en" }))).toContain("Consultation fee & payment");
    expect(reply(run("Assalamualaikum", { lang: "ur" }))).toMatch(/^Wa alaikum assalam/);
    expect(reply(run("Hello sir", { lang: "ur" }))).toMatch(/^Hello/);
  });

  it("fee reply uses the configured fee, falls back politely when empty", () => {
    expect(reply(run("fee kitni hai", { lang: "ur" }))).toContain("Rs 1500");
    const d = run("fee kitni hai", { settings: { ...settings, consultationFee: "" } });
    expect(reply(d)).toContain("clinic se rabta karein");
  });

  it("location reply includes address; empty address falls back", () => {
    expect(reply(run("clinic kahan hai", { lang: "ur" }))).toContain("Dahranwala");
    expect(reply(run("address?", { settings: { ...settings, address: "" } }))).toContain("rabta karein");
  });
});

// ---------------------------------------------------------------------------------------------
describe("language detection", () => {
  it.each([
    ["Assalamualaikum", "ur"],
    ["AJ clinic khula h y ni", "ur"],
    ["kal subah 10 bje appointment chahiye", "ur"],
    ["haan ji", "ur"],
    ["fees kitni hai", "ur"],
    ["کلینک کھلا ہے؟", "ur"],
    ["I need to book an appointment", "en"],
    ["What is the consultation fee and payment method?", "en"],
    ["Location of the clinic", "en"],
    ["thank you doctor", "en"],
  ])("%s -> %s", (t, l) => expect(detectLang(t)).toBe(l));
  it("returns null when it cannot tell (keeps the patient's previous language)", () => {
    expect(detectLang("123")).toBeNull();
    expect(detectLang("???")).toBeNull();
    expect(detectLang("😀")).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
describe("Roman Urdu date & time parsing", () => {
  const p = (t: string) => parseDateTime(t, NOW, TZ);
  it("kal = tomorrow, aaj = today, parson = day after tomorrow", () => {
    expect(p("kal")).toMatchObject({ date: { year: 2025, month: 6, day: 3 } });
    expect(p("aaj")).toMatchObject({ date: { year: 2025, month: 6, day: 2 } });
    expect(p("parson")).toMatchObject({ date: { year: 2025, month: 6, day: 4 } });
  });
  it("N bje -> clock time (1-7 = pm, 8+ as written)", () => {
    expect(p("kal 4 bje").time).toEqual({ hour: 16, minute: 0 });
    expect(p("kal 10 bje").time).toEqual({ hour: 10, minute: 0 });
    expect(p("kal 4:30 baje").time).toEqual({ hour: 16, minute: 30 });
    expect(p("5 bjy").time).toEqual({ hour: 17, minute: 0 });
  });
  it("day periods", () => {
    expect(p("kal subah").period).toBe("morning");
    expect(p("aj dopahar").period).toBe("afternoon");
    expect(p("kal shaam").period).toBe("evening");
  });
  it("Urdu weekday names", () => {
    expect(p("juma ko").date).toMatchObject({ day: 6 }); // Fri 6 June
    expect(p("mangal").date).toMatchObject({ day: 3 });
  });
  it("English still works", () => {
    expect(p("friday 4pm")).toMatchObject({ date: { day: 6 }, time: { hour: 16, minute: 0 } });
    expect(p("15/06 11:15")).toMatchObject({ date: { month: 6, day: 15 }, time: { hour: 11, minute: 15 } });
  });
});

// ---------------------------------------------------------------------------------------------
describe("booking flow (Roman Urdu)", () => {
  it("exact slot -> asks YES, then 'haan' books it", () => {
    const d1 = run("kal subah 10 bje appointment chahiye");
    expect(d1.intent).toBe("booking");
    const setP = d1.actions.find((a) => a.type === "setPending");
    expect(setP).toBeTruthy();
    expect(reply(d1)).toContain("reserve kar sakta hoon");
    expect(reply(d1)).toContain("Dr. Waqas");

    const pending = (setP as { pending: PendingState }).pending;
    expect(pending.options).toHaveLength(1);
    for (const yes of ["haan", "ji", "Ji haan", "theek hai", "YES", "confirm", "kar do"]) {
      const d2 = run(yes, { pending });
      expect(d2.intent, yes).toBe("confirm");
      const book = d2.actions.find((a) => a.type === "book");
      expect(book, yes).toMatchObject({ type: "book", status: "confirmed" });
      expect(reply(d2), yes).toContain("Confirm!");
    }
  });

  it("no time given -> offers numbered slots, number picks one", () => {
    const d1 = run("appointment chahiye");
    const pending = (d1.actions.find((a) => a.type === "setPending") as { pending: PendingState }).pending;
    expect(pending.options.length).toBeGreaterThan(1);
    expect(reply(d1)).toContain("1)");
    const d2 = run("2", { pending });
    expect(d2.intent).toBe("choose");
    expect(d2.actions.find((a) => a.type === "book")).toBeTruthy();
    const bad = run("9", { pending: { ...pending, options: pending.options.slice(0, 2) } });
    expect(reply(bad)).toContain("1 se 2");
    expect(bad.actions.find((a) => a.type === "book")).toBeUndefined();
  });

  it("'kal subah' offers morning slots only", () => {
    const d = run("kal subah appointment");
    const pending = (d.actions.find((a) => a.type === "setPending") as { pending: PendingState }).pending;
    for (const o of pending.options) expect(new Date(o).getUTCHours() + 5).toBeLessThan(12);
  });

  it("taken slot is refused and alternatives offered", () => {
    const busy = [{ startsAt: at(3, 10), durationMin: 30 }];
    const d = run("kal 10 bje appointment", { busy });
    expect(reply(d)).toContain("pehle se book hai");
    expect(d.actions.find((a) => a.type === "book")).toBeUndefined();
    expect(d.actions.find((a) => a.type === "setPending")).toBeTruthy();
  });

  it("outside hours / Sunday / past are refused with reasons", () => {
    expect(reply(run("kal 8 bje appointment"))).toContain("clinic ke waqt se bahar");
    expect(reply(run("itwar 10 bje appointment"))).toContain("clinic band hota hai");
    expect(reply(run("aaj 9 bje appointment"))).toMatch(/guzar chuka|qareeb/);
  });

  it("doctor-approval mode records a pending request", () => {
    const pend: PendingState = { options: [at(3, 10).toISOString()], consultType: "consultation" };
    const d = run("haan", { pending: pend, settings: { ...settings, autoConfirm: false } });
    expect(d.actions.find((a) => a.type === "book")).toMatchObject({ status: "pending" });
    expect(reply(d)).toContain("darkhwast mil gayi");
  });

  it("online consultation is recognised", () => {
    const d = run("online consultation kal 5 bje");
    const pending = (d.actions.find((a) => a.type === "setPending") as { pending: PendingState }).pending;
    expect(pending.consultType).toBe("video consultation");
  });

  it("already has appointment -> mentions it", () => {
    expect(reply(run("appointment chahiye", { upcoming: [appt()] }))).toContain("pehle se hai");
  });
});

// ---------------------------------------------------------------------------------------------
describe("confirm / cancel / reschedule (Roman Urdu + English)", () => {
  it("patient confirms upcoming appointment", () => {
    const d = run("haan", { upcoming: [appt()] });
    expect(d.actions).toContainEqual({ type: "patientConfirm", id: 7 });
    expect(reply(d)).toContain("confirm hai");
  });
  it("already confirmed -> 'all set'", () => {
    expect(reply(run("ji", { upcoming: [appt({ patientConfirmed: true })] }))).toContain("pehle se confirm");
  });
  it("nothing to confirm", () => {
    expect(reply(run("haan"))).toContain("koi appointment pending nahi");
  });
  it.each(["cancel", "mansookh", "nahi aa sakta", "nahi aa sakti", "appointment cancel kar do", "cancel kardo"])("cancel: %s", (t) => {
    const d = run(t, { upcoming: [appt()] });
    expect(d.intent).toBe("cancel");
    expect(d.actions).toContainEqual({ type: "cancel", id: 7 });
    expect(reply(d)).toContain("cancel kar di gayi");
  });
  it("cancel with nothing booked", () => {
    expect(reply(run("cancel"))).toContain("koi aanay wali appointment nahi");
  });
  it.each(["reschedule", "time change karna hai", "dusra time chahiye", "koi aur din", "waqt badal do"])("reschedule: %s", (t) => {
    const d = run(t, { upcoming: [appt()] });
    expect(d.intent).toBe("reschedule");
    const pending = (d.actions.find((a) => a.type === "setPending") as { pending: PendingState }).pending;
    expect(pending.replaceId).toBe(7);
  });
  it("rescheduling into the SAME busy slot of the old appointment is allowed (replaceId ignored)", () => {
    const d = run("kal 10 bje", { upcoming: [appt()], busy: [{ id: 7, startsAt: at(3, 10), durationMin: 30 }], pending: { options: ["x"], consultType: "consultation", replaceId: 7 } });
    expect(reply(d)).toContain("reserve kar sakta hoon");
  });
  it("reschedule with no appointment starts a new booking", () => {
    expect(reply(run("time change karna hai"))).toContain("nayi booking");
  });
  it("cancelling a pending (unconfirmed) request", () => {
    const d = run("cancel", { pending: { options: [at(3, 10).toISOString()], consultType: "consultation" } });
    expect(d.actions).toContainEqual({ type: "clearPending" });
    expect(reply(d)).toContain("darkhwast cancel");
  });
  it("English equivalents", () => {
    expect(reply(run("cancel", { lang: "en", upcoming: [appt()] }))).toContain("has been cancelled");
    expect(reply(run("yes", { lang: "en", upcoming: [appt()] }))).toContain("is confirmed");
  });
});

// ---------------------------------------------------------------------------------------------
describe("emergency triage", () => {
  it.each([
    "seene mein dard hai",
    "saans nahi aa rahi",
    "meri walida behosh ho gayi",
    "dil ka daura lag raha hai",
    "bohat khoon beh raha hai",
    "سینے میں درد ہے",
    "severe chest pain",
    "she is unconscious",
  ])("flags: %s", (t) => {
    const d = run(t);
    expect(d.urgent, t).toBe(true);
    expect(d.intent).toBe("emergency");
    expect(reply(d)).toContain("1122");
  });
  it("Roman Urdu emergency reply is in Roman Urdu with disclaimer", () => {
    const r = reply(run("seene mein dard hai"));
    expect(r).toContain("fori taur par 1122");
    expect(r).toContain("automated assistant");
  });
  it.each([
    "seene mein dard nahi hai",
    "seene me dard nhi",
    "I have no chest pain",
    "this is not an emergency",
  ])("does NOT flag negation: %s", (t) => {
    expect(detectEmergency(t), t).toEqual([]);
  });
  it("urgent always wins over booking words", () => {
    expect(classify("appointment chahiye mujhe saans nahi aa rahi").urgent).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe("out-of-hours auto-responder", () => {
  it("adds the closed notice (Roman Urdu) to the first reply", () => {
    const d = run("fee kitni hai", { now: NIGHT });
    expect(reply(d)).toContain("abhi band hai");
    expect(reply(d)).toContain("1122");
  });
  it("no closed notice for thanks / slot choices", () => {
    expect(reply(run("shukriya", { now: NIGHT }))).not.toContain("abhi band hai");
  });
  it("English closed notice", () => {
    expect(reply(run("hours", { now: NIGHT, lang: "en" }))).toContain("closed right now");
  });
});

// ---------------------------------------------------------------------------------------------
describe("other intents & edge cases", () => {
  it("thanks / shukriya / jazakallah", () => {
    for (const t of ["thanks", "shukriya", "jazakallah", "Thank you for reply ..."]) expect(run(t).intent, t).toBe("thanks");
    expect(reply(run("shukriya"))).toContain("Shukriya");
  });
  it("medication, preparation, symptoms", () => {
    expect(run("meri dawai ka dose kya hai").intent).toBe("medication");
    expect(run("what should i bring before the appointment").intent).toBe("preparation");
    expect(run("fasting required hai?").intent).toBe("preparation");
    expect(reply(run("mujhe bukhar hai"))).toContain("diagnosis nahi kar sakta");
  });
  it("garbage / emoji / empty-ish messages never crash and are flagged for review", () => {
    for (const t of ["???", "😀😀", "   ", ".", "asdfgh", "a".repeat(2000), "<script>alert(1)</script>", "'; DROP TABLE patients; --"]) {
      const d = run(t);
      expect(d.replies.length, t).toBeGreaterThan(0);
      expect(d.urgent).toBe(false);
    }
    expect(run("asdfgh").needsReview).toBe(true);
  });
  it("a bare number with no pending state is not a booking choice", () => {
    expect(run("3").intent).not.toBe("choose");
  });
  it("English and Roman Urdu share structure: same actions for same intent", () => {
    const a = run("kal 10 bje appointment", { lang: "ur" });
    const b = run("kal 10 bje appointment", { lang: "en" });
    expect(a.actions).toEqual(b.actions);
  });
});

// ---------------------------------------------------------------------------------------------
describe("message catalog completeness", () => {
  it("every message exists in both languages and never contains 'undefined'", () => {
    const slot = formatSlot(at(3, 10), TZ);
    for (const l of ["en", "ur"] as const) {
      const M = msgs(l);
      const all = [
        M.disclaimer, M.closed("C", "H", "1122"), M.emergency("1122", "Dr. Waqas"),
        M.reason("past"), M.reason("closed"), M.reason("outside_hours"), M.reason("conflict"),
        M.reserve("", "consultation", "Dr. Waqas", slot), M.sorryAt("x", slot), M.sorry("x"), M.noSlotsOn("morning", "Tue"), M.noSlotsOn("", "Tue"),
        M.noFree("", "H"), M.nextTimes("", "Dr. Waqas", "1) a"), M.confirmed("t", "d", slot, "addr"), M.confirmed("t", "d", slot, ""),
        M.received(slot), M.pickNumber(3), M.pickSlot(3), M.thanksConfirmed(slot), M.allSet(slot), M.nothingToConfirm,
        M.cancelledReq, M.cancelledAppt(slot), M.noApptToCancel, M.rescheduleNone, M.rescheduleSure, M.haveAppt(slot),
        M.hours("C", "H", true, slot, "1122"), M.hours("C", "H", false, null, "1122"), M.fee("Rs 1"), M.fee(""), M.location("C", "A", "H"), M.location("C", "", "H"),
        M.prep("p", "d"), M.medication("d"), M.symptoms("1122", "d"), M.greeting("Ali", "C", true), M.greeting("", "C", false),
        M.thanks, M.unknown("d", "1122"), M.unsupported, M.doctorConfirmed("t", "d", slot), M.doctorCancelled(slot),
        M.reminder2("t", "d", slot), M.reminder24("t", "d", slot),
      ];
      for (const m of all) {
        expect(m).toBeTruthy();
        expect(m).not.toContain("undefined");
        expect(m).not.toContain("NaN");
      }
    }
    expect(msgs("ur").thanks).not.toEqual(msgs("en").thanks);
  });
  it("WhatsApp message length stays under the 4096 limit", () => {
    for (const l of ["en", "ur"] as const) {
      const M = msgs(l);
      expect(M.symptoms("1122", "Dr. Waqas").length).toBeLessThan(1500);
      expect(M.greeting("Ali", "Clinic", true).length).toBeLessThan(1500);
    }
  });
});
