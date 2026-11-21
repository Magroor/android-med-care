export type YMD = { year: number; month: number; day: number };

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function tzParts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(date)) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    weekday: WEEKDAY_INDEX[p.weekday] ?? 0,
  };
}

/** Convert a wall-clock time in `tz` to a UTC Date (DST-safe via fixed-point iteration). */
export function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, tz: string): Date {
  const target = Date.UTC(y, m - 1, d, h, mi);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = tzParts(new Date(guess), tz);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess -= asUtc - target;
  }
  return new Date(guess);
}

export function todayYMD(now: Date, tz: string): YMD {
  const p = tzParts(now, tz);
  return { year: p.year, month: p.month, day: p.day };
}

export function addDaysYMD(ymd: YMD, n: number): YMD {
  const d = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function weekdayOf(ymd: YMD): number {
  return new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day)).getUTCDay();
}

export function isValidYMD(ymd: YMD): boolean {
  const d = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day));
  return d.getUTCFullYear() === ymd.year && d.getUTCMonth() === ymd.month - 1 && d.getUTCDate() === ymd.day;
}

export function formatSlot(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDay(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function describeWorkDays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0) return "by appointment";
  if (sorted.length === 7) return "Every day";
  // collapse consecutive runs, treating Mon..Sun order
  const order = sorted.map((d) => (d + 6) % 7).sort((a, b) => a - b); // Mon=0
  const runs: number[][] = [];
  for (const d of order) {
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === d - 1) last.push(d);
    else runs.push([d]);
  }
  const name = (m: number) => DAY_NAMES[(m + 1) % 7];
  return runs
    .map((r) => (r.length > 1 ? `${name(r[0])}–${name(r[r.length - 1])}` : name(r[0])))
    .join(", ");
}
