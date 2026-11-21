import { describe, expect, it } from "vitest";
import { classify, detectEmergency, parseConsultType, parseDateTime } from "../src/lib/intent";

// Monday 2 June 2025, 11:30 in Asia/Kolkata
const NOW = new Date("2025-06-02T06:00:00Z");
const TZ = "Asia/Kolkata";

describe("emergency triage", () => {
  it.each([
    "I have severe chest pain",
    "my father can't breathe",
    "She is unconscious and not responding",
    "there is heavy bleeding after the procedure",
    "EMERGENCY please help",
    "I think I'm having a stroke",
  ])("flags %s", (text) => {
    const c = classify(text);
    expect(c.intent).toBe("emergency");
    expect(c.urgent).toBe(true);
    expect(c.keywords.length).toBeGreaterThan(0);
  });

  it("does not flag negated symptoms", () => {
    expect(detectEmergency("I have no chest pain, just a mild cough")).toEqual([]);
    expect(detectEmergency("this is not an emergency, just a question")).toEqual([]);
  });

  it("prefers the most specific keyword", () => {
    expect(detectEmergency("severe bleeding")).toEqual(["severe bleeding"]);
  });
});

describe("intent classification", () => {
  it.each([
    ["I want to book an appointment", "booking"],
    ["Can I see the doctor tomorrow?", "booking"],
    ["please reschedule my appointment", "reschedule"],
    ["cancel my booking", "cancel"],
    ["yes", "confirm"],
    ["CONFIRM", "confirm"],
    ["what are your clinic timings?", "hours"],
    ["what is your address", "location"],
    ["I have a fever and cough", "symptoms"],
    ["what time should I take the tablet", "medication"],
    ["how do I prepare for the test, do I need fasting", "preparation"],
    ["hello", "greeting"],
    ["thanks!", "thanks"],
    ["blah blah", "unknown"],
  ])("%s -> %s", (text, intent) => {
    expect(classify(text).intent).toBe(intent);
  });

  it("treats a bare number as a slot choice only when options are pending", () => {
    expect(classify("2", { hasPending: true }).intent).toBe("choose");
    expect(classify("2", { hasPending: false }).intent).not.toBe("choose");
  });
});

describe("date/time parsing", () => {
  it("parses tomorrow + am/pm time", () => {
    const r = parseDateTime("book me tomorrow at 10am", NOW, TZ);
    expect(r.date).toEqual({ year: 2025, month: 6, day: 3 });
    expect(r.time).toEqual({ hour: 10, minute: 0 });
  });

  it("parses weekday names to the next occurrence", () => {
    expect(parseDateTime("friday 4:30 pm", NOW, TZ)).toMatchObject({ date: { year: 2025, month: 6, day: 6 }, time: { hour: 16, minute: 30 } });
    // same weekday means next week
    expect(parseDateTime("monday", NOW, TZ).date).toEqual({ year: 2025, month: 6, day: 9 });
  });

  it("parses numeric and named dates", () => {
    expect(parseDateTime("on 15/06 at 11:15", NOW, TZ)).toMatchObject({ date: { year: 2025, month: 6, day: 15 }, time: { hour: 11, minute: 15 } });
    expect(parseDateTime("12th of july", NOW, TZ).date).toEqual({ year: 2025, month: 7, day: 12 });
    expect(parseDateTime("2025-08-01", NOW, TZ).date).toEqual({ year: 2025, month: 8, day: 1 });
  });

  it("rolls past dates into next year", () => {
    expect(parseDateTime("3 march", NOW, TZ).date).toEqual({ year: 2026, month: 3, day: 3 });
  });

  it("handles 12am/12pm and bare 'at 5'", () => {
    expect(parseDateTime("12pm", NOW, TZ).time).toEqual({ hour: 12, minute: 0 });
    expect(parseDateTime("12am", NOW, TZ).time).toEqual({ hour: 0, minute: 0 });
    expect(parseDateTime("tomorrow at 5", NOW, TZ).time).toEqual({ hour: 17, minute: 0 });
  });

  it("detects day periods", () => {
    expect(parseDateTime("friday morning", NOW, TZ).period).toBe("morning");
  });

  it("returns nothing for text without a date", () => {
    expect(parseDateTime("hello doctor", NOW, TZ)).toEqual({});
  });
});

describe("consult type", () => {
  it("detects types", () => {
    expect(parseConsultType("video call please")).toBe("video consultation");
    expect(parseConsultType("follow-up for my report")).toBe("follow-up");
    expect(parseConsultType("book an appointment")).toBe("consultation");
  });
});
