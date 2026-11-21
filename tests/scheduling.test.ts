import { describe, expect, it } from "vitest";
import { generateSlots, isOpenNow, nextAvailableSlots, overlaps, validateSlot, type ClinicConfig } from "../src/lib/scheduling";
import { describeWorkDays, zonedToUtc } from "../src/lib/time";

const cfg: ClinicConfig = { timezone: "Asia/Kolkata", openTime: "09:00", closeTime: "17:00", workDays: [1, 2, 3, 4, 5], slotMinutes: 30 };
const NOW = new Date("2025-06-02T06:00:00Z"); // Mon 11:30 IST
const at = (d: number, h: number, m = 0) => zonedToUtc(2025, 6, d, h, m, cfg.timezone);

describe("time zones", () => {
  it("converts wall-clock times in a zone to UTC", () => {
    expect(at(3, 10).toISOString()).toBe("2025-06-03T04:30:00.000Z");
    expect(zonedToUtc(2025, 1, 15, 9, 0, "America/New_York").toISOString()).toBe("2025-01-15T14:00:00.000Z");
    expect(zonedToUtc(2025, 7, 15, 9, 0, "America/New_York").toISOString()).toBe("2025-07-15T13:00:00.000Z"); // DST
  });
  it("describes working days", () => {
    expect(describeWorkDays([1, 2, 3, 4, 5])).toBe("Mon–Fri");
    expect(describeWorkDays([1, 3, 6])).toBe("Mon, Wed, Sat");
  });
});

describe("slot generation", () => {
  it("creates 16 half-hour slots for 9–17", () => {
    const slots = generateSlots({ year: 2025, month: 6, day: 3 }, cfg);
    expect(slots).toHaveLength(16);
    expect(slots[0].toISOString()).toBe(at(3, 9).toISOString());
    expect(slots[15].toISOString()).toBe(at(3, 16, 30).toISOString());
  });
  it("returns nothing on closed days (Sunday)", () => {
    expect(generateSlots({ year: 2025, month: 6, day: 8 }, cfg)).toEqual([]);
  });
});

describe("conflict resolution", () => {
  const busy = [{ id: 1, startsAt: at(3, 10), durationMin: 30 }];

  it("detects exact and partial overlaps but allows back-to-back", () => {
    expect(overlaps(at(3, 10), 30, busy)).toBe(true);
    expect(overlaps(at(3, 10, 15), 30, busy)).toBe(true);
    expect(overlaps(at(3, 9, 45), 30, busy)).toBe(true);
    expect(overlaps(at(3, 10, 30), 30, busy)).toBe(false);
    expect(overlaps(at(3, 9, 30), 30, busy)).toBe(false);
  });

  it("validates slots", () => {
    expect(validateSlot(at(3, 10), cfg, busy, NOW)).toEqual({ ok: false, reason: "conflict" });
    expect(validateSlot(at(3, 11), cfg, busy, NOW)).toEqual({ ok: true });
    expect(validateSlot(at(2, 9), cfg, busy, NOW)).toEqual({ ok: false, reason: "past" });
    expect(validateSlot(at(7, 10), cfg, busy, NOW)).toEqual({ ok: false, reason: "closed" }); // Saturday
    expect(validateSlot(at(3, 8), cfg, busy, NOW)).toEqual({ ok: false, reason: "outside_hours" });
    expect(validateSlot(at(3, 16, 45), cfg, busy, NOW)).toEqual({ ok: false, reason: "outside_hours" }); // would run past 17:00
  });

  it("does not suggest taken slots and skips the weekend", () => {
    const all = generateSlots({ year: 2025, month: 6, day: 6 }, cfg).map((s) => ({ startsAt: s, durationMin: 30 })); // Friday fully booked
    const slots = nextAvailableSlots(at(6, 8), cfg, all, 3, { fromYMD: { year: 2025, month: 6, day: 6 } });
    expect(slots[0].toISOString()).toBe(at(9, 9).toISOString()); // next Monday 09:00
  });
});

describe("opening hours", () => {
  it("knows when the clinic is open", () => {
    expect(isOpenNow(NOW, cfg)).toBe(true);
    expect(isOpenNow(new Date("2025-06-02T14:00:00Z"), cfg)).toBe(false); // 19:30 IST
    expect(isOpenNow(new Date("2025-06-07T06:00:00Z"), cfg)).toBe(false); // Saturday
  });
});
