import { urduToRoman } from "./urdu";
import { addDaysYMD, isValidYMD, todayYMD, weekdayOf, type YMD } from "./time";

export type Intent =
  | "emergency"
  | "booking"
  | "reschedule"
  | "cancel"
  | "confirm"
  | "choose"
  | "hours"
  | "location"
  | "fee"
  | "symptoms"
  | "medication"
  | "preparation"
  | "greeting"
  | "optout"
  | "optin"
  | "human"
  | "thanks"
  | "unknown";

export type Category = "emergency" | "booking" | "question" | "other";

export function categoryOf(intent: Intent): Category {
  switch (intent) {
    case "emergency":
      return "emergency";
    case "booking":
    case "reschedule":
    case "cancel":
    case "confirm":
    case "choose":
      return "booking";
    case "hours":
    case "location":
    case "fee":
    case "symptoms":
    case "medication":
    case "preparation":
      return "question";
    default:
      return "other";
  }
}

export const EMERGENCY_KEYWORDS = [
  "chest pain",
  "chest pressure",
  "chest tightness",
  "can't breathe",
  "cant breathe",
  "cannot breathe",
  "can not breathe",
  "trouble breathing",
  "difficulty breathing",
  "difficulty in breathing",
  "shortness of breath",
  "short of breath",
  "not breathing",
  "severe bleeding",
  "heavy bleeding",
  "bleeding",
  "vomiting blood",
  "coughing blood",
  "unconscious",
  "unresponsive",
  "passed out",
  "fainted",
  "stroke",
  "seizure",
  "heart attack",
  "suicid",
  "overdose",
  "poison",
  "emergency",
  "severe pain",
  "unbearable pain",
  "choking",
  "allergic reaction",
  "anaphyla",
  "paralys",
  "slurred speech",
  // Roman Urdu / Hindi
  "seene mein dard",
  "seene me dard",
  "sine me dard",
  "saans nahi",
  "sans nahi",
  "saans nhi",
  "behosh",
  "dil ka daura",
  "khoon beh",
  "bohat khoon",
  "zyada khoon",
  "dora pra",
  // Urdu script
  "سینے میں درد",
  "سانس نہیں",
  "بے ہوش",
  "دل کا دورہ",
  "خون بہ",
];

const NEGATION = /\b(no|not|without|denies|never|don't have|dont have|didn't have|nothing like)\s+(?:\w+\s+){0,2}$/;

export function normalizeText(text: string): string {
  return urduToRoman(text)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectEmergency(text: string): string[] {
  const t = normalizeText(text);
  const hits: string[] = [];
  for (const kw of EMERGENCY_KEYWORDS) {
    const idx = t.indexOf(kw);
    if (idx < 0) continue;
    const prefix = t.slice(Math.max(0, idx - 30), idx);
    if (NEGATION.test(prefix)) continue;
    // Roman Urdu postfix negation: "seene mein dard nahi hai" (no chest pain)
    const suffix = t.slice(idx + kw.length, idx + kw.length + 14);
    if (/^\s*(bilkul\s+)?(hai\s+)?(nahi|nhi|ni)\b/.test(suffix) && !/\b(nahi|nhi|ni)$/.test(kw)) continue;
    // drop shorter keyword if a longer one already covers it (e.g. "severe bleeding" vs "bleeding")
    if (hits.some((h) => h.includes(kw))) continue;
    hits.push(kw);
  }
  return hits;
}

// ---------------------------------------------------------------- date / time

export type ParsedWhen = {
  date?: YMD;
  time?: { hour: number; minute: number };
  period?: "morning" | "afternoon" | "evening";
};

const MONTH_RE =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAY_RE =
  "(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues|tue|wed|thurs|thur|thu|fri|sat)";
const WEEKDAYS: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function monthNum(name: string): number {
  return MONTHS.indexOf(name.slice(0, 3)) + 1;
}

function rollYear(ymd: YMD, today: YMD, explicitYear: boolean): YMD {
  if (explicitYear) return ymd;
  const cmp = ymd.month * 100 + ymd.day < today.month * 100 + today.day;
  return cmp ? { ...ymd, year: ymd.year + 1 } : ymd;
}

/** Maps common Roman Urdu date/time words to the English tokens the parser understands. */
export function romanUrduToEnglish(t: string): string {
  return t
    .replace(/\b(parson|parsoon)\b/g, "day after tomorrow")
    .replace(/\b(kal|kl)\b/g, "tomorrow")
    .replace(/\b(aj|aaj|ajj)\b/g, "today")
    .replace(/\b(subah|subha|subh|sabah)\b/g, "morning")
    .replace(/\b(dopahar|dopehar|dupahar)\b/g, "afternoon")
    .replace(/\b(shaam|sham)\b/g, "evening")
    .replace(/\b(raat|rat)\b/g, "night")
    .replace(/\b(peer|pir|somwar)\b/g, "monday")
    .replace(/\b(mangal|mangl)\b/g, "tuesday")
    .replace(/\b(budh|budhwar)\b/g, "wednesday")
    .replace(/\b(jumerat|jumeraat|jumarat)\b/g, "thursday")
    .replace(/\b(juma|jumma|jumah)\b/g, "friday")
    .replace(/\b(hafta|haftay)\b/g, "saturday")
    .replace(/\b(itwar|itwaar|aitwar)\b/g, "sunday")
    // "4 bje", "4:30 baje", "4 bjy" -> "at 4"
    .replace(/\b(\d{1,2})(?::(\d{2}))?\s*(?:bje|baje|bajy|bjy|bajay)\b/g, (_m, h: string, mi?: string) => (mi ? `at ${+h >= 1 && +h <= 7 ? +h + 12 : h}:${mi}` : `at ${h}`));
}

export function parseDateTime(text: string, now: Date, tz: string): ParsedWhen {
  let t = " " + romanUrduToEnglish(normalizeText(text)) + " ";
  const today = todayYMD(now, tz);
  const out: ParsedWhen = {};
  let m: RegExpMatchArray | null;

  // --- date ---
  if ((m = t.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/))) {
    const ymd = { year: +m[1], month: +m[2], day: +m[3] };
    if (isValidYMD(ymd)) {
      out.date = ymd;
      t = t.replace(m[0], " ");
    }
  }
  if (!out.date && (m = t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}\\b`)))) {
    const ymd = rollYear({ year: today.year, month: monthNum(m[2]), day: +m[1] }, today, false);
    if (isValidYMD(ymd)) {
      out.date = ymd;
      t = t.replace(m[0], " ");
    }
  }
  if (!out.date && (m = t.match(new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`)))) {
    const ymd = rollYear({ year: today.year, month: monthNum(m[1]), day: +m[2] }, today, false);
    if (isValidYMD(ymd)) {
      out.date = ymd;
      t = t.replace(m[0], " ");
    }
  }
  if (!out.date && (m = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/))) {
    let day = +m[1];
    let month = +m[2];
    if (month > 12 && day <= 12) [day, month] = [month, day];
    const explicitYear = !!m[3];
    let year = today.year;
    if (m[3]) year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const ymd = rollYear({ year, month, day }, today, explicitYear);
    if (month >= 1 && month <= 12 && isValidYMD(ymd)) {
      out.date = ymd;
      t = t.replace(m[0], " ");
    }
  }
  if (!out.date) {
    if (/\bday after tomorrow\b/.test(t)) out.date = addDaysYMD(today, 2);
    else if (/\b(tomorrow|tmrw|tmr|tomorow|tommorow)\b/.test(t)) out.date = addDaysYMD(today, 1);
    else if (/\b(today|tonight|this evening|this afternoon|this morning)\b/.test(t)) out.date = today;
    else if ((m = t.match(new RegExp(`\\b(?:next\\s+|this\\s+|on\\s+)?${WEEKDAY_RE}\\b`)))) {
      const target = WEEKDAYS[m[1].slice(0, 3)];
      let diff = (target - weekdayOf(today) + 7) % 7;
      if (diff === 0) diff = 7;
      out.date = addDaysYMD(today, diff);
    }
  }

  // --- time ---
  if ((m = t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?m\b/))) {
    const h = +m[1];
    const mi = m[2] ? +m[2] : 0;
    if (h >= 1 && h <= 12 && mi < 60) {
      out.time = { hour: (h % 12) + (m[3] === "p" ? 12 : 0), minute: mi };
    }
  }
  if (!out.time && (m = t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/))) {
    out.time = { hour: +m[1], minute: +m[2] };
  }
  if (!out.time && /\bnoon\b/.test(t)) out.time = { hour: 12, minute: 0 };
  if (!out.time && (m = t.match(/\bat\s+(\d{1,2})\b(?!\s*[/-])/))) {
    let h = +m[1];
    if (h >= 1 && h <= 23) {
      if (h >= 1 && h <= 7) h += 12; // clinics rarely open before 8: "at 5" => 5pm
      out.time = { hour: h, minute: 0 };
    }
  }

  if (/\bmorning\b/.test(t)) out.period = "morning";
  else if (/\bafternoon\b/.test(t)) out.period = "afternoon";
  else if (/\b(evening|night|tonight)\b/.test(t)) out.period = "evening";

  return out;
}

export function parseConsultType(text: string): string {
  const t = normalizeText(text);
  if (/\b(video|online|tele|virtual|zoom|remote)\b/.test(t)) return "video consultation";
  if (/\b(follow[- ]?up|review|report|results?)\b/.test(t)) return "follow-up";
  if (/\b(check[- ]?up|routine|general|physical|health check)\b/.test(t)) return "general check-up";
  if (/\b(in[- ]?person|clinic visit|visit)\b/.test(t)) return "in-person consultation";
  return "consultation";
}

// ------------------------------------------------------------ classification

export type Classification = {
  intent: Intent;
  urgent: boolean;
  keywords: string[];
};

export function classify(text: string, ctx: { hasPending?: boolean } = {}): Classification {
  const t = normalizeText(text);
  const keywords = detectEmergency(t);
  if (keywords.length > 0) return { intent: "emergency", urgent: true, keywords };

  const mk = (intent: Intent): Classification => ({ intent, urgent: false, keywords: [] });

  // consent: STOP / START (WhatsApp policy: opt-outs must be honoured)
  if (/^(stop|stop all|stop messages?|unsubscribe|opt ?out|band karo|band kar do|band kardo|band karein|mat bhejo|mat bhejein|mat bheje|messages? band( karo| kar do| kardo)?|msg band( karo| kar do)?)[.! ]*$/.test(t)) return mk("optout");
  if (/^(start|subscribe|resume|opt ?in|shuru|dobara shuru|messages? shuru( karo| kar do)?)[.! ]*$/.test(t)) return mk("optin");
  if (ctx.hasPending && /^\s*([1-9])\s*[.)]?\s*(please)?\s*$/.test(t)) return mk("choose");
  if (/^(yes|y|yep|yeah|yup|ok|okay|sure|confirm|confirmed|yes confirm|yes please|confirm please|i confirm|done|haan|han|ha|ji|jee|g|ji haan|ji han|jee haan|haan ji|han ji|theek hai|thik hai|theek h|thik h|ok ji|okay ji|bilkul|zaroor|confirm kar do|confirm kar dein|kar do|kardo|book kar do)[.! ]*$/.test(t)) {
    return mk("confirm");
  }
  // Greetings in Roman Urdu / Arabic ("Assalamualaikum", "salam")
  if (/^(as+a?l+a?m\w*|salam\w*|slam|aoa|السلام)[\s\w.!]*$/.test(t) && t.split(" ").length <= 6) return mk("greeting");
  if (/\b(time (change|badal|badlo)|waqt (change|badal|badlo)|(dusra|doosra|aur|koi aur) (time|waqt|din|slot)|din badal|resched|postpone|change (my |the )?(appointment|time|slot|booking|date)|move (my |the )?(appointment|booking)|another (time|day|slot))/.test(t)) {
    return mk("reschedule");
  }
  if (/\b(cancel|call off|won't be able to come|cannot come|can't come|mansookh|(nahi|nhi|ni) (aa|a) (sak|pa)\w*|cancel (kar|kr)\w*)\b/.test(t)) return mk("cancel");
  // human hand-off (WhatsApp policy: automation needs a clear escalation path)
  if (!/\b(book|appointment|slot|cancel|resched)\b/.test(t) && /\b(human|real person|live agent|agent|receptionist|staff|operator|talk to (the )?(doctor|someone|a person)|speak to (the )?(doctor|someone|a person)|doctor se (baat|bat)|baat karni hai|baat karna hai|insaan se|banda chahiye|call (me|karein|kar do|kardo)|phone (karein|kar do|kardo))\b/.test(t)) return mk("human");
  // medication / preparation questions win over "appointment"/"visit" words and Roman Urdu time words
  if (/\b(medicine|medication|tablet|pill|dose|dosage|prescription|syrup|capsule|refill|dawai|dawa|goli|goliyan|nuskha|nuskhe)s?\b/.test(t) && !/\b(book|appointment)\b/.test(t)) {
    return mk("medication");
  }
  if (/\b(prepare|preparation|fasting|fast before|what (should|do) i (bring|carry)|what to bring|documents|before (the|my) (test|appointment|visit|surgery)|saath (lana|le)|kya lana|parhez|parhaiz)\b/.test(t)) {
    return mk("preparation");
  }
  const hasBookWord = /\b(appointment|appt|book|booked|booking|slot|slots)\b/.test(t);
  // Roman Urdu / Urdu availability: "clinic khula hai?", "aj clinic h on?", "kitne bje aen ge", "timing bta dein"
  if (
    !/\b(book|appointment|cancel|resched)\b/.test(t) &&
    (/\b(khula|khulla|khuli|kitne bj[ey]|kitny bj[ey]|kab tk|kab tak|bethna|baithna|timing|time bata|time bta|clinic (ka|ki|k) (time|waqt)|(time|timing) kya|clinic (h|hai|hy|he) on|clinic on|ayn ge|aen ge|ain ge|aa jay?(n)?ge|aaj clinic|aj clinic|open h)\b/.test(t) ||
      /(کلینک|کھلا|کب تک|ٹائم|وقت)/.test(t) ||
      /\b(ayn|aye|aen|aaye|ain) (ni|nahi|nhi)\b|\b(ap|aap)\b.*\b(ayn|aye|aen|hen|hain)\b.*\bclinic\b|\b(ap|aap)\b.*\b(ayn|ain|aen|aye|aaye|aa)\b.*\b(jy?n?\s?ge|jayen\w*|jaen\w*)\b/.test(t) ||
      /available (at|in) (the )?clinic|(doctor|dr)\.? ?(sahb|sahib|sab)? (are you )?(available|present)|are you (available|there|present) (at|in) (the )?clinic/.test(t))
  ) {
    return mk("hours");
  }
  if (!hasBookWord && /\b(fees?|charges?|cost|price|kitne (paisy|paise|pese|rupay|rupees)|payment)\b/.test(t)) return mk("fee");
  if (/\b(kahan|kaha|kidhar|jagah)\b/.test(t) || /(کہاں|پتہ)/.test(t)) return mk("location");
  if (/\b(milna|dikhana|dikhwana|check karwa\w*|mil jay ?ga|mil jaye ga|time mil|time (chahiye|chahye|chahie|lena|lene)|ana hy|aana hai|aana hy)\b/.test(t)) return mk("booking");
  if (/\b(appointment|appt|book|booking|schedule|slots?|consult|consultation|see (the |a )?doctor|meet (the )?doctor|visit|availab\w*|check[- ]?up)\b/.test(t)) {
    return mk("booking");
  }
  if (/\b(medicine|medication|tablet|pill|dose|dosage|prescription|syrup|capsule|refill)s?\b/.test(t)) {
    return mk("medication");
  }
  if (/\b(prepare|preparation|fasting|fast before|what (should|do) i (bring|carry)|documents|before (the|my) (test|appointment|visit|surgery))\b/.test(t)) {
    return mk("preparation");
  }
  if (/(\bhours\b|opening|closing|timings?\b|are you open|when (are|do) you (open|close)|what time.*(open|close)|working days)/.test(t)) {
    return mk("hours");
  }
  if (/\b(address|location|where (is|are)|directions?|map|parking|how to reach)\b/.test(t)) return mk("location");
  if (/\b(symptoms?|fever|cough|cold|flu|headache|migraine|pain|ache|rash|vomit\w*|nausea|dizz\w*|sore|infection|swelling|diarr\w*|stomach|throat|fatigue|tired|sick|unwell|not feeling well|itch\w*|allerg\w*|illaj|ilaj|ilaaj|treatment|thyroid|diabet\w*|sugar|blood pressure|dard|bukhar)\b/.test(t)) {
    return mk("symptoms");
  }
  if (/^(hi|hii+|hello|hey|good (morning|afternoon|evening)|namaste|hola)\b/.test(t)) return mk("greeting");
  if (/\b(thanks|thank you|thx|ty|shukriya|shukria|shukriyah|jazakallah|jazak allah|meherbani|mehrbani)\b/.test(t)) return mk("thanks");

  // A bare date/time is most likely a booking answer
  return mk("unknown");
}
