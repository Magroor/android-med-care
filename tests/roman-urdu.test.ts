import { describe, expect, it } from "vitest";
import { classify } from "../src/lib/intent";

// Real patient phrasings (Roman Urdu / Urdu / English) from clinic WhatsApp chats.
describe("Roman Urdu / mixed-language patient messages", () => {
  it.each([
    ["Assalamualaikum", "greeting"],
    ["Asslamoalikum", "greeting"],
    ["Assalam o alaikum", "greeting"],
    ["Kitne bje Ayn ge clinic", "hours"],
    ["AJ clinic h on?", "hours"],
    ["AJ h clinic timing bta dn", "hours"],
    ["AJ clinic khula h y ni", "hours"],
    ["Dr sab ap ny aj Kitne bjy bethna hy bwp", "hours"],
    ["Doctor sahb are you available at clinic now?", "hours"],
    ["Location of the clinic", "location"],
    ["Doctor consultation fee", "fee"],
    ["What is the consultation fee and payment method?", "fee"],
    ["Thyroid ka pasant he app illaj karate ho", "symptoms"],
    ["I need to book an appointment", "booking"],
    ["Dr sahib Suba ka time mil jay ga dahranwala se ana hy check karwany", "booking"],
    ["How can an online appointment be booked?", "booking"],
    ["Do you also provide online consultation?", "booking"],
  ])("%s -> %s", (text, intent) => {
    expect(classify(text).intent).toBe(intent);
  });

  it("flags Roman Urdu emergencies", () => {
    expect(classify("seene mein dard ho raha hai").urgent).toBe(true);
    expect(classify("saans nahi aa rahi").urgent).toBe(true);
  });
});
