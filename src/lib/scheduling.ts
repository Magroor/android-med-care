import { addDaysYMD, todayYMD, tzParts, weekdayOf, zonedToUtc, type YMD } from "./time";

export type ClinicConfig = {
  timezone: string;
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
  workDays: number[]; // 0=Sun
  slotMinutes: number;
};

export type Busy = { id?: number; startsAt: Date; durationMin: number };

export type SlotCheck = { ok: true } | { ok: false; reason: "past" | "closed" | "outside_hours" | "conflict" };

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isWorkDay(ymd: YMD, cfg: ClinicConfig): boolean {
  return cfg.workDays.includes(weekdayOf(ymd));
}

/** Is the clinic accepting walk-in/phone contact right now? */
export function isOpenNow(now: Date, cfg: ClinicConfig): boolean {
  const p = tzParts(now, cfg.timezone);
  if (!cfg.workDays.includes(p.weekday)) return false;
  const mins = p.hour * 60 + p.minute;
  return mins >= toMinutes(cfg.openTime) && mins < toMinutes(cfg.closeTime);
}

export function generateSlots(ymd: YMD, cfg: ClinicConfig): Date[] {
  if (!isWorkDay(ymd, cfg)) return [];
  const slots: Date[] = [];
  const open = toMinutes(cfg.openTime);
  const close = toMinutes(cfg.closeTime);
  for (let m = open; m + cfg.slotMinutes <= close; m += cfg.slotMinutes) {
    slots.push(zonedToUtc(ymd.year, ymd.month, ymd.day, Math.floor(m / 60), m % 60, cfg.timezone));
  }
  return slots;
}

export function overlaps(start: Date, durationMin: number, busy: Busy[]): boolean {
  const s = start.getTime();
  const e = s + durationMin * 60_000;
  return busy.some((b) => {
    const bs = b.startsAt.getTime();
    const be = bs + b.durationMin * 60_000;
    return s < be && bs < e;
  });
}

export function validateSlot(
  start: Date,
  cfg: ClinicConfig,
  busy: Busy[],
  now: Date,
  opts: { durationMin?: number; leadMinutes?: number } = {},
): SlotCheck {
  const dur = opts.durationMin ?? cfg.slotMinutes;
  const lead = opts.leadMinutes ?? 15;
  if (start.getTime() < now.getTime() + lead * 60_000) return { ok: false, reason: "past" };
  const p = tzParts(start, cfg.timezone);
  if (!cfg.workDays.includes(p.weekday)) return { ok: false, reason: "closed" };
  const mins = p.hour * 60 + p.minute;
  if (mins < toMinutes(cfg.openTime) || mins + dur > toMinutes(cfg.closeTime)) {
    return { ok: false, reason: "outside_hours" };
  }
  if (overlaps(start, dur, busy)) return { ok: false, reason: "conflict" };
  return { ok: true };
}

export function periodFilter(period: string | undefined, tz: string): (d: Date) => boolean {
  if (!period) return () => true;
  return (d) => {
    const h = tzParts(d, tz).hour;
    if (period === "morning") return h < 12;
    if (period === "afternoon") return h >= 12 && h < 17;
    return h >= 17; // evening / night
  };
}

export function availableSlotsOn(
  ymd: YMD,
  cfg: ClinicConfig,
  busy: Busy[],
  now: Date,
  filter: (d: Date) => boolean = () => true,
): Date[] {
  return generateSlots(ymd, cfg).filter(
    (s) => filter(s) && validateSlot(s, cfg, busy, now).ok,
  );
}

export function nextAvailableSlots(
  now: Date,
  cfg: ClinicConfig,
  busy: Busy[],
  count: number,
  opts: { filter?: (d: Date) => boolean; maxDays?: number; fromYMD?: YMD } = {},
): Date[] {
  const out: Date[] = [];
  const start = opts.fromYMD ?? todayYMD(now, cfg.timezone);
  const maxDays = opts.maxDays ?? 21;
  for (let i = 0; i < maxDays && out.length < count; i++) {
    const day = addDaysYMD(start, i);
    const slots = availableSlotsOn(day, cfg, busy, now, opts.filter);
    // spread suggestions across days: at most 3 per day when looking across days
    for (const s of slots.slice(0, count - out.length > 3 ? 3 : count - out.length)) out.push(s);
  }
  return out;
}
