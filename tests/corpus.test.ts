import { describe, expect, it } from "vitest";
import { decide, type EngineSettings } from "../src/lib/engine";
import { resolveLang } from "../src/lib/lang";
import { classify, detectEmergency } from "../src/lib/intent";
import { zonedToUtc } from "../src/lib/time";
import { ALL, NEGATED, UNKNOWN, type Row } from "./corpus";

const settings: EngineSettings = {
  timezone: "Asia/Karachi",
  openTime: "09:00",
  closeTime: "17:00",
  workDays: [1, 2, 3, 4, 5, 6],
  slotMinutes: 30,
  clinicName: "Dr. Waqas Clinic",
  doctorName: "Dr. Waqas",
  emergencyNumber: "1122",
  address: "Dahranwala",
  prepInstructions: "Bring ID.",
  consultationFee: "Rs 1500",
  autoConfirm: true,
};
const NOW = zonedToUtc(2025, 6, 2, 11, 30, "Asia/Karachi"); // Monday, open

const isUrduScript = (s: string) => /[؀-ۿ]/.test(s);
// Roman Urdu reply markers vs English reply markers
const RU_REPLY = /\b(aap|aur|ke|ki|ka|likhein|karein|hai|hain|abhi|waqt|maazrat|shukriya|barah-e-karam|paigham|bhejein|nahi)\b/i;
const EN_REPLY = /\b(the|you|your|please|reply|clinic|hours|thanks|welcome|sorry|have|can)\b/i;

function lang(text: string) {
  return resolveLang(text, null, "ur").lang;
}
function runRow([text]: Row) {
  return decide({ text, now: NOW, settings, lang: lang(text), patientName: null, pending: null, upcoming: [], busy: [] });
}

describe(`patient message corpus (${ALL.length} messages: English, Roman Urdu, Urdu script)`, () => {
  it("has 300+ patient messages", () => {
    expect(ALL.length + NEGATED.length + UNKNOWN.length).toBeGreaterThanOrEqual(300);
  });

  for (const row of ALL) {
    const [text, intent] = row;
    it(`${JSON.stringify(text)} -> ${intent}`, () => {
      const d = runRow(row);
      expect(d.intent).toBe(intent);
      expect(d.replies.length).toBeGreaterThan(0);
      expect(d.urgent).toBe(intent === "emergency");
      const reply = d.replies.join("\n");
      expect(reply).not.toMatch(/undefined|NaN|\[object/);
      expect(reply.length).toBeLessThan(4000); // WhatsApp text limit
      // reply language follows the patient: Urdu script / Roman Urdu -> Roman Urdu; clear English -> English
      const l = lang(text);
      if (l === "ur") expect(reply).toMatch(RU_REPLY);
      else expect(reply).toMatch(EN_REPLY);
      // every emergency reply carries the helpline and the safety disclaimer
      if (intent === "emergency") {
        expect(reply).toContain("1122");
        expect(reply.toLowerCase()).toContain("automated assistant");
      }
      // Urdu-script patients never get raw Urdu-script echo / mojibake in replies
      if (isUrduScript(text)) expect(reply).not.toMatch(/[؀-ۿ]/);
    });
  }

  for (const text of NEGATED) {
    it(`negated danger word is not urgent: ${JSON.stringify(text)}`, () => {
      expect(detectEmergency(text)).toEqual([]);
      expect(classify(text).urgent).toBe(false);
    });
  }

  for (const text of UNKNOWN) {
    it(`harmless / unknown never crashes or flags urgent: ${JSON.stringify(text)}`, () => {
      const d = decide({ text, now: NOW, settings, lang: lang(text), patientName: null, pending: null, upcoming: [], busy: [] });
      expect(d.urgent).toBe(false);
      expect(d.replies.length).toBeGreaterThan(0);
    });
  }
});

describe("language auto-detect on the corpus", () => {
  it("Urdu-script rows are all detected as Urdu", () => {
    for (const [t] of ALL.filter(([t]) => isUrduScript(t))) expect(resolveLang(t, null, "en").lang, t).toBe("ur");
  });
  it("sticky: a Roman Urdu patient typing one English word keeps Roman Urdu", () => {
    for (const t of ["cancel", "Location of the clinic", "Doctor consultation fee", "Online consultation", "thanks"]) {
      expect(resolveLang(t, "ur", "ur").lang, t).toBe("ur");
    }
  });
  it("sticky: a clearly English message does switch", () => {
    expect(resolveLang("I need to book an appointment for tomorrow please", "ur", "ur").lang).toBe("en");
  });
  it("English patient writing Roman Urdu switches", () => {
    expect(resolveLang("kal subah 10 bje appointment chahiye", "en", "ur").lang).toBe("ur");
  });
});
