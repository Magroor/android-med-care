import { classify, parseConsultType, parseDateTime, type Intent } from "./intent";
import {
  availableSlotsOn,
  isOpenNow,
  nextAvailableSlots,
  periodFilter,
  validateSlot,
  type Busy,
  type ClinicConfig,
  type SlotCheck,
} from "./scheduling";
import { msgs, type Lang, type Msgs } from "./lang";
import { describeWorkDays, formatDay, formatSlot, todayYMD, zonedToUtc, addDaysYMD } from "./time";

export const DISCLAIMER = msgs("en").disclaimer;

export type EngineSettings = ClinicConfig & {
  clinicName: string;
  doctorName: string;
  emergencyNumber: string;
  address: string;
  prepInstructions: string;
  consultationFee?: string;
  autoConfirm: boolean;
};

export type PendingState = { options: string[]; consultType: string; replaceId?: number | null };

export type UpcomingAppt = {
  id: number;
  startsAt: Date;
  durationMin: number;
  status: string;
  patientConfirmed: boolean;
  consultType: string;
};

export type Action =
  | { type: "setPending"; pending: PendingState }
  | { type: "clearPending" }
  | { type: "book"; start: Date; consultType: string; status: "confirmed" | "pending"; replaceId?: number | null }
  | { type: "cancel"; id: number }
  | { type: "patientConfirm"; id: number }
  | { type: "setOptOut"; value: boolean };

export type DecideInput = {
  /** reply language; defaults to English */
  lang?: Lang;
  text: string;
  now: Date;
  settings: EngineSettings;
  patientName?: string | null;
  pending: PendingState | null;
  upcoming: UpcomingAppt[];
  busy: Busy[];
};

export type Decision = {
  intent: Intent;
  urgent: boolean;
  keywords: string[];
  replies: string[];
  actions: Action[];
  /** the bot could not understand – surface to staff */
  needsReview?: boolean;
};

function hoursLine(s: EngineSettings): string {
  return `${describeWorkDays(s.workDays)}, ${s.openTime}–${s.closeTime} (${s.timezone})`;
}

export function closedNotice(s: EngineSettings, lang: Lang = "en"): string {
  return msgs(lang).closed(s.clinicName, hoursLine(s), s.emergencyNumber);
}

export function emergencyReply(s: EngineSettings, lang: Lang = "en"): string {
  return msgs(lang).emergency(s.emergencyNumber, s.doctorName);
}

function listSlots(slots: Date[], tz: string): string {
  return slots.map((s, i) => `${i + 1}) ${formatSlot(s, tz)}`).join("\n");
}

function reasonText(check: SlotCheck, M: Msgs): string {
  return check.ok ? "" : M.reason(check.reason);
}

export function decide(inp: DecideInput): Decision {
  const { text, now, settings: s } = inp;
  const lang: Lang = inp.lang ?? "en";
  const M = msgs(lang);
  const hasPending = !!inp.pending && inp.pending.options.length > 0;
  const cls = classify(text, { hasPending });
  const actions: Action[] = [];
  const replies: string[] = [];
  const tz = s.timezone;
  let intent: Intent = cls.intent;

  const result = (extra: Partial<Decision> = {}): Decision => ({
    intent,
    urgent: cls.urgent,
    keywords: cls.keywords,
    replies,
    actions,
    ...extra,
  });

  if (intent === "emergency") {
    replies.push(emergencyReply(s, lang));
    return result();
  }

  const when = parseDateTime(text, now, tz);
  // A bare "tomorrow 5pm" with nothing else is a booking answer
  if (intent === "unknown" && (when.date || when.time)) intent = "booking";

  const closed = !isOpenNow(now, s) ? closedNotice(s, lang) : null;

  // ------------------------------------------------------------- helpers
  const next = inp.upcoming[0];

  const offer = (opts: { replaceId?: number | null; consultType: string; intro?: string }) => {
    const busy = inp.busy.filter((b) => b.id === undefined || b.id !== opts.replaceId);
    const filter = periodFilter(when.period, tz);
    let slots: Date[] = [];
    let intro = opts.intro ?? "";

    // exact date + time
    if (when.date && when.time) {
      const start = zonedToUtc(when.date.year, when.date.month, when.date.day, when.time.hour, when.time.minute, tz);
      const check = validateSlot(start, s, busy, now);
      if (check.ok) {
        const pending: PendingState = { options: [start.toISOString()], consultType: opts.consultType, replaceId: opts.replaceId };
        actions.push({ type: "setPending", pending });
        replies.push(M.reserve(intro, opts.consultType, s.doctorName, formatSlot(start, tz)).trim());
        return;
      }
      intro = M.sorryAt(reasonText(check, M), formatSlot(start, tz));
      slots = availableSlotsOn(when.date, s, busy, now);
      if (slots.length === 0) slots = nextAvailableSlots(now, s, busy, 5, { fromYMD: when.date });
      else slots = nearestTo(slots, start, 5);
    } else if (when.date) {
      slots = availableSlotsOn(when.date, s, busy, now, filter);
      if (slots.length === 0) {
        intro = M.noSlotsOn(when.period ?? "", formatDay(zonedToUtc(when.date.year, when.date.month, when.date.day, 12, 0, tz), tz));
        slots = nextAvailableSlots(now, s, busy, 5, { filter, fromYMD: when.date });
      } else {
        slots = slots.slice(0, 6);
      }
    } else if (when.time) {
      // same clock time on the next days it is free
      const today = todayYMD(now, tz);
      for (let i = 0; i < 14 && slots.length < 4; i++) {
        const d = addDaysYMD(today, i);
        const start = zonedToUtc(d.year, d.month, d.day, when.time.hour, when.time.minute, tz);
        if (validateSlot(start, s, busy, now).ok) slots.push(start);
      }
      if (slots.length === 0) slots = nextAvailableSlots(now, s, busy, 5);
    } else {
      slots = nextAvailableSlots(now, s, busy, 5, { filter });
      if (slots.length === 0 && when.period) slots = nextAvailableSlots(now, s, busy, 5);
    }

    if (slots.length === 0) {
      replies.push(M.noFree(intro, hoursLine(s)));
      return;
    }
    const pending: PendingState = {
      options: slots.map((d) => d.toISOString()),
      consultType: opts.consultType,
      replaceId: opts.replaceId,
    };
    actions.push({ type: "setPending", pending });
    replies.push(M.nextTimes(intro, s.doctorName, listSlots(slots, tz)).trim());
  };

  const book = (start: Date, p: PendingState) => {
    const busy = inp.busy.filter((b) => b.id === undefined || b.id !== p.replaceId);
    const check = validateSlot(start, s, busy, now);
    if (!check.ok) {
      offer({ consultType: p.consultType, replaceId: p.replaceId, intro: M.sorry(reasonText(check, M)) });
      return;
    }
    const status = s.autoConfirm ? "confirmed" : "pending";
    actions.push({ type: "book", start, consultType: p.consultType, status, replaceId: p.replaceId });
    actions.push({ type: "clearPending" });
    if (status === "confirmed") {
      replies.push(M.confirmed(p.consultType, s.doctorName, formatSlot(start, tz), s.address));
    } else {
      replies.push(M.received(formatSlot(start, tz)));
    }
  };

  // ------------------------------------------------------------- intents
  switch (intent) {
    case "choose": {
      const n = Number(text.replace(/\D/g, ""));
      const p = inp.pending!;
      if (n < 1 || n > p.options.length) {
        replies.push(M.pickNumber(p.options.length));
      } else {
        book(new Date(p.options[n - 1]), p);
      }
      break;
    }
    case "confirm": {
      if (hasPending) {
        const p = inp.pending!;
        if (p.options.length === 1) book(new Date(p.options[0]), p);
        else replies.push(M.pickSlot(p.options.length));
      } else {
        const target = inp.upcoming.find((a) => !a.patientConfirmed);
        if (target) {
          actions.push({ type: "patientConfirm", id: target.id });
          replies.push(M.thanksConfirmed(formatSlot(target.startsAt, tz)));
        } else if (next) {
          replies.push(M.allSet(formatSlot(next.startsAt, tz)));
        } else {
          replies.push(M.nothingToConfirm);
        }
      }
      break;
    }
    case "cancel": {
      if (hasPending && !next) {
        actions.push({ type: "clearPending" });
        replies.push(M.cancelledReq);
      } else if (next) {
        actions.push({ type: "cancel", id: next.id });
        actions.push({ type: "clearPending" });
        replies.push(M.cancelledAppt(formatSlot(next.startsAt, tz)));
      } else {
        replies.push(M.noApptToCancel);
      }
      break;
    }
    case "reschedule": {
      const replaceId = next?.id ?? inp.pending?.replaceId ?? null;
      if (!replaceId) {
        offer({ consultType: parseConsultType(text), intro: M.rescheduleNone });
      } else {
        offer({ consultType: next?.consultType ?? parseConsultType(text), replaceId, intro: M.rescheduleSure });
      }
      break;
    }
    case "booking": {
      const consultType = parseConsultType(text);
      const keepType = inp.pending && consultType === "consultation" ? inp.pending.consultType : consultType;
      const intro = next && !inp.pending ? M.haveAppt(formatSlot(next.startsAt, tz)) : "";
      offer({ consultType: keepType, replaceId: inp.pending?.replaceId ?? null, intro });
      break;
    }
    case "hours": {
      const slot = nextAvailableSlots(now, s, inp.busy, 1)[0];
      replies.push(M.hours(s.clinicName, hoursLine(s), isOpenNow(now, s), slot ? formatSlot(slot, tz) : null, s.emergencyNumber));
      break;
    }
    case "fee": {
      replies.push(M.fee(s.consultationFee));
      break;
    }
    case "location": {
      replies.push(M.location(s.clinicName, s.address, hoursLine(s)));
      break;
    }
    case "preparation": {
      replies.push(M.prep(s.prepInstructions, s.doctorName));
      break;
    }
    case "medication": {
      replies.push(M.medication(s.doctorName));
      break;
    }
    case "symptoms": {
      replies.push(M.symptoms(s.emergencyNumber, s.doctorName));
      break;
    }
    case "greeting": {
      const salam = /^\s*(as+a?l+a?m|salam|slam|aoa|السلام)/i.test(text);
      replies.push(M.greeting(inp.patientName ?? "", s.clinicName, salam));
      break;
    }
    case "optout": {
      actions.push({ type: "setOptOut", value: true }, { type: "clearPending" });
      replies.push(M.optout);
      return result({ replies });
    }
    case "optin": {
      actions.push({ type: "setOptOut", value: false });
      replies.push(M.optin);
      return result({ replies });
    }
    case "human": {
      replies.push(M.human(s.doctorName));
      return result({ needsReview: true, replies: withClosedNotice(replies, closed, intent) });
    }
    case "thanks": {
      replies.push(M.thanks);
      break;
    }
    default: {
      replies.push(M.unknown(s.doctorName, s.emergencyNumber));
      return result({ needsReview: true, replies: withClosedNotice(replies, closed, intent) });
    }
  }

  return result({ replies: withClosedNotice(replies, closed, intent) });
}

/** One WhatsApp message instead of two; skipped mid-conversation (slot picks, thanks, confirmations). */
function withClosedNotice(replies: string[], closed: string | null, intent: Intent): string[] {
  if (!closed || replies.length === 0 || ["thanks", "choose", "confirm", "hours"].includes(intent)) return replies;
  return [`${closed}\n\n${replies[0]}`, ...replies.slice(1)];
}

/** The `n` slots closest to `target`, returned in chronological order. */
function nearestTo(slots: Date[], target: Date, n: number): Date[] {
  return [...slots]
    .sort((a, b) => Math.abs(a.getTime() - target.getTime()) - Math.abs(b.getTime() - target.getTime()))
    .slice(0, n)
    .sort((a, b) => a.getTime() - b.getTime());
}
