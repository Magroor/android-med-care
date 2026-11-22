/**
 * Language support: English ("en") and Roman Urdu ("ur", Urdu written in Latin letters, as most
 * WhatsApp patients type). Detection is per message; the patient's last detected language is
 * remembered and used for reminders / doctor-initiated messages.
 */
export type Lang = "en" | "ur";

const UR_WORDS = new Set(
  (
    "assalam assalamualaikum assalamoalaikum asslamoalikum salam slam aoa walaikum wa alaikum " +
    "ap aap apka apki apke ap ny aapne ne ka ki ke ko se mein main mai hai hain hy hn h hen hun hoon ho " +
    "kya kia kiya kyun kion kese kaise kaisay kahan kaha kab kitne kitna kitni kitny " +
    "nahi nhi nai ni na han haan ji jee jo ye yeh woh wo is us aur ya bhi bhe tak tk " +
    "bje baje bjy bajy bajay subah subha dopahar shaam raat kal aj aaj parson abhi " +
    "clinic khula khulla khuli band bata batao bta btao batayein dein den dain karein karain krain kare kar karna karwana karwany " +
    "chahta chahti chahiye chahye lena lene dena dikhana dikhwana milna mil milay mile milega jayega jaye ga gi ge gay " +
    "dard bukhar khansi illaj ilaj dawai dawa sugar thyroid pasant pareshan takleef " +
    "doctor sahb sahib sab sir madam time timing fees fee paisy paise pese kitne rupay " +
    "shukriya shukria meherbani jazakallah mansookh theek thik acha accha zaroor bilkul " +
    "ana aana aao aen ayn aye aaye ayenge aenge bethna baithna bethen " +
    "appointment lena hy hn rha rhi raha rahi tha thi hon wala wali tou to bhai"
  ).split(/\s+/),
);

const EN_WORDS = new Set(
  (
    "the is are was were am i you your my me we our can could would should will do does did have has had " +
    "what when where which who how why please thanks thank hello hi hey good morning afternoon evening " +
    "need want like to for of in on at with and or not no yes about also any available book booking " +
    "appointment doctor clinic open close closed hours location address fee fees consultation online " +
    "tomorrow today tonight monday tuesday wednesday thursday friday saturday sunday cancel reschedule " +
    "pain fever cough headache medicine tablet"
  ).split(/\s+/),
);
// words that exist in both lists but are meaningful only as English when alone; ignore for scoring
const NEUTRAL = new Set(["doctor", "clinic", "appointment", "time", "timing", "fee", "fees", "sir", "madam", "no", "to", "do", "in", "is", "on", "h", "ok", "yes"]);

/** "ur" | "en" when confident, otherwise null (caller keeps the patient's previous language). */
export function detectLang(text: string): Lang | null {
  return detectLangScored(text).lang;
}

/**
 * Pick the reply language. Sticky: a patient who has been writing Roman Urdu is not switched to
 * English by one or two English words ("cancel", "Doctor consultation fee"); it takes a clearly
 * English message (3+ English words, more than Urdu ones).
 */
export function resolveLang(text: string, previous: Lang | null | undefined, fallback: Lang): { lang: Lang; remember: Lang | null } {
  const d = detectLangScored(text);
  if (d.lang === null) return { lang: previous ?? fallback, remember: null };
  if (d.lang === "en" && previous === "ur" && d.en < 4) return { lang: "ur", remember: null };
  return { lang: d.lang, remember: d.lang };
}

export function detectLangScored(text: string): { lang: Lang | null; ur: number; en: number } {
  if (/[؀-ۿ]/.test(text)) return { lang: "ur", ur: 99, en: 0 }; // Urdu / Arabic script
  const words = text.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).filter(Boolean);
  let ur = 0;
  let en = 0;
  for (const w of words) {
    if (NEUTRAL.has(w)) continue;
    if (UR_WORDS.has(w)) ur++;
    else if (EN_WORDS.has(w)) en++;
  }
  if (ur === 0 && en === 0) return { lang: null, ur, en };
  return { lang: ur >= en ? "ur" : "en", ur, en };
}

export const isLang = (v: unknown): v is Lang => v === "en" || v === "ur";

const PERIOD_UR: Record<string, string> = { morning: "subah", afternoon: "dopahar", evening: "shaam" };

type Fmt = { disclaimer: string };

function build(l: Lang) {
  const en = l === "en";
  const disclaimer = en
    ? "ℹ️ I'm an automated assistant giving administrative and preliminary guidance only. This is not a medical diagnosis or a substitute for a consultation with a doctor."
    : "ℹ️ Main ek automated assistant hoon jo sirf intizami aur ibtidai rehnumai deta hai. Yeh koi medical diagnosis nahi aur doctor se mashwaray ka badal nahi.";
  const f: Fmt = { disclaimer };
  return {
    disclaimer,
    closed: (clinic: string, hours: string, emerg: string) =>
      en
        ? `🌙 ${clinic} is currently closed. Clinic hours: ${hours}. For emergencies call ${emerg} or go to your nearest emergency department. Staff will review your message when we reopen.`
        : `🌙 ${clinic} abhi band hai. Clinic ka waqt: ${hours}. Emergency ki soorat mein ${emerg} par call karein ya qareebi emergency department jayein. Clinic khulte hi staff aap ka paigham dekh lega.`,
    emergency: (emerg: string, doctor: string) =>
      en
        ? `🚨 What you describe may be a medical emergency. Please call ${emerg} or go to the nearest emergency department immediately — do not wait for a reply here.\n\n${doctor}'s team has been alerted about your message.\n\n${f.disclaimer}`
        : `🚨 Jo aap bata rahe hain woh medical emergency ho sakti hai. Barah-e-karam fori taur par ${emerg} par call karein ya qareebi emergency department pohanchein — yahan jawab ka intezar na karein.\n\n${doctor} ki team ko aap ke paigham ki ittila de di gayi hai.\n\n${f.disclaimer}`,
    reason: (r: "past" | "closed" | "outside_hours" | "conflict") =>
      en
        ? { past: "that time has already passed or is too soon", closed: "the clinic is closed that day", outside_hours: "that is outside clinic hours", conflict: "that slot is already taken" }[r]
        : { past: "yeh waqt guzar chuka hai ya bohat qareeb hai", closed: "us din clinic band hota hai", outside_hours: "yeh clinic ke waqt se bahar hai", conflict: "yeh slot pehle se book hai" }[r],
    reserve: (intro: string, type: string, doctor: string, slot: string) =>
      en
        ? `${intro}I can reserve a ${type} with ${doctor} on ${slot}.\n\nReply YES to confirm, or send another day/time.`
        : `${intro}Main ${doctor} ke saath ${slot} ka ${type} reserve kar sakta hoon.\n\nConfirm karne ke liye YES (ya "haan") likhein, ya koi aur din/waqt bhejein.`,
    sorryAt: (reason: string, slot: string) => (en ? `Sorry, ${reason} (${slot}). ` : `Maazrat, ${reason} (${slot}). `),
    sorry: (reason: string) => (en ? `Sorry, ${reason}. ` : `Maazrat, ${reason}. `),
    noSlotsOn: (period: string, day: string) =>
      en
        ? `Sorry, there are no free ${period} slots on ${day}. `.replace("  ", " ")
        : `Maazrat, ${day} ko koi khali ${PERIOD_UR[period] ?? ""} slot nahi hai. `.replace("  ", " "),
    noFree: (intro: string, hours: string) =>
      en
        ? `${intro}I couldn't find a free slot in the next few weeks. Our staff will contact you shortly to arrange a time. Clinic hours: ${hours}.`
        : `${intro}Agle kuch haftoon mein koi khali slot nahi mila. Hamara staff jald aap se rabta karega. Clinic ka waqt: ${hours}.`,
    nextTimes: (intro: string, doctor: string, list: string) =>
      en
        ? `${intro}Here are the next available times with ${doctor}:\n${list}\n\nReply with a number to choose, or tell me another day/time (e.g. "Friday 4pm").`
        : `${intro}${doctor} ke saath agle dastiyab waqt:\n${list}\n\nChunne ke liye number likhein, ya koi aur din/waqt batayein (maslan "Friday 4 bje" ya "kal subah").`,
    confirmed: (type: string, doctor: string, slot: string, addr: string) =>
      en
        ? `✅ Confirmed! Your ${type} with ${doctor} is booked for ${slot}${addr ? ` at ${addr}` : ""}.\n\nI'll send reminders 24 hours and 2 hours before. Reply CANCEL or RESCHEDULE any time.`
        : `✅ Confirm! Aap ka ${type} ${doctor} ke saath ${slot} par book ho gaya hai${addr ? ` (${addr})` : ""}.\n\n24 ghantay aur 2 ghantay pehle yaad dehani bheji jayegi. Kisi bhi waqt CANCEL ya RESCHEDULE likh dein.`,
    received: (slot: string) =>
      en
        ? `📝 Your request for ${slot} has been received. The clinic will confirm it shortly and I'll message you here.`
        : `📝 ${slot} ke liye aap ki darkhwast mil gayi hai. Clinic jald confirm karega aur yahin aap ko ittila di jayegi.`,
    pickNumber: (n: number) =>
      en ? `Please reply with a number between 1 and ${n}, or send another day/time.` : `Barah-e-karam 1 se ${n} ke darmiyan number likhein, ya koi aur din/waqt bhejein.`,
    pickSlot: (n: number) =>
      en ? `Please reply with the number of the slot you prefer (1–${n}).` : `Barah-e-karam apni pasand ke slot ka number likhein (1–${n}).`,
    thanksConfirmed: (slot: string) =>
      en ? `👍 Thank you — your appointment on ${slot} is confirmed. See you then!` : `👍 Shukriya — ${slot} ki aap ki appointment confirm hai. Milte hain!`,
    allSet: (slot: string) =>
      en
        ? `You're all set for ${slot}. Reply RESCHEDULE or CANCEL if plans change.`
        : `${slot} ke liye aap ki appointment pehle se confirm hai. Plan badle to RESCHEDULE ya CANCEL likhein.`,
    nothingToConfirm: en
      ? "I don't have anything waiting for confirmation. Reply BOOK to schedule an appointment."
      : "Confirmation ke liye koi appointment pending nahi. Appointment ke liye BOOK likhein.",
    cancelledReq: en
      ? "No problem — I've cancelled that request. Message me any time to book again."
      : "Theek hai — maine woh darkhwast cancel kar di hai. Dobara booking ke liye kisi bhi waqt paigham karein.",
    cancelledAppt: (slot: string) =>
      en
        ? `Your appointment on ${slot} has been cancelled. Reply BOOK whenever you'd like a new time.`
        : `${slot} ki aap ki appointment cancel kar di gayi hai. Naye waqt ke liye BOOK likhein.`,
    noApptToCancel: en
      ? "I couldn't find an upcoming appointment to cancel. Reply BOOK to schedule one."
      : "Cancel karne ke liye koi aanay wali appointment nahi mili. Nayi appointment ke liye BOOK likhein.",
    rescheduleNone: en
      ? "I couldn't find an existing appointment, so let's book a new one. "
      : "Aap ki koi maujooda appointment nahi mili, is liye nayi booking karte hain. ",
    rescheduleSure: en ? "Sure, let's find a new time. " : "Jee zaroor, naya waqt dhoondte hain. ",
    haveAppt: (slot: string) =>
      en
        ? `You already have an appointment on ${slot} (reply RESCHEDULE to change it). `
        : `Aap ki ${slot} ki appointment pehle se hai (badalne ke liye RESCHEDULE likhein). `,
    hours: (clinic: string, hours: string, open: boolean, nextSlot: string | null, emerg: string) =>
      en
        ? `🕘 ${clinic} hours: ${hours}. We are ${open ? "open now" : "closed right now"}.${nextSlot ? `\nNext available appointment: ${nextSlot}.` : ""}\nEmergencies: call ${emerg}.\n\nReply BOOK to schedule a visit.`
        : `🕘 ${clinic} ka waqt: ${hours}. Clinic abhi ${open ? "khula hai" : "band hai"}.${nextSlot ? `\nAgli dastiyab appointment: ${nextSlot}.` : ""}\nEmergency ke liye ${emerg} par call karein.\n\nAppointment ke liye BOOK likhein.`,
    fee: (fee: string | undefined) =>
      fee
        ? en
          ? `💳 Consultation fee & payment: ${fee}\n\nWe also offer online (video) consultations. Reply BOOK to pick a time.`
          : `💳 Consultation fees aur payment: ${fee}\n\nHum online (video) consultation bhi karte hain. Waqt lene ke liye BOOK likhein.`
        : en
          ? `💳 Please contact the clinic for the current consultation fee and payment options. Reply BOOK to schedule a visit, in person or online.`
          : `💳 Maujooda consultation fees aur payment ke tareeqon ke liye barah-e-karam clinic se rabta karein. Clinic ya online appointment ke liye BOOK likhein.`,
    location: (clinic: string, addr: string, hours: string) =>
      addr
        ? en
          ? `📍 ${clinic}\n${addr}\n\nHours: ${hours}.`
          : `📍 ${clinic}\n${addr}\n\nWaqt: ${hours}.`
        : en
          ? `📍 Please contact the clinic for the address. Hours: ${hours}.`
          : `📍 Address ke liye barah-e-karam clinic se rabta karein. Waqt: ${hours}.`,
    prep: (prep: string, doctor: string) =>
      en
        ? `📋 Preparing for your visit:\n${prep}\n\nFor test- or procedure-specific instructions, follow what ${doctor} advised.\n\n${f.disclaimer}`
        : `📋 Visit ki tayyari:\n${prep}\n\nKisi test ya procedure ki khaas hidayat ke liye wohi karein jo ${doctor} ne bataya ho.\n\n${f.disclaimer}`,
    medication: (doctor: string) =>
      en
        ? `💊 Please take medicines exactly as written on your prescription and don't change or stop a dose without medical advice. For refills or questions about timing, I can book a consultation or flag your message for ${doctor}'s team.\n\nReply BOOK to schedule a consult.\n\n${f.disclaimer}`
        : `💊 Dawai bilkul usi tarah lein jaise nuskhay (prescription) mein likhi hai, aur doctor ke mashwaray ke baghair dose na badlein ya na chorein. Dawai ke waqt ya refill ke sawal par main consultation book kar sakta hoon ya aap ka paigham ${doctor} ki team tak pohancha sakta hoon.\n\nConsultation ke liye BOOK likhein.\n\n${f.disclaimer}`,
    symptoms: (emerg: string, doctor: string) =>
      en
        ? `Thanks for letting us know. I can't diagnose over chat, but general guidance: rest, stay hydrated, and note when symptoms started and how they change. Seek urgent care (call ${emerg}) for trouble breathing, chest pain, heavy bleeding, confusion, fainting or sudden severe symptoms.\n\nWould you like to see ${doctor}? Reply BOOK to pick a time.\n\n${f.disclaimer}`
        : `Ittila dene ka shukriya. Main chat par diagnosis nahi kar sakta, lekin aam rehnumai: aaram karein, paani zyada piyein, aur note karein ke alamaat kab shuru hui aur kaise badal rahi hain. Saans mein takleef, seene mein dard, zyada khoon behna, behoshi ya achanak shadeed alamaat par fori ${emerg} par call karein.\n\n${doctor} se milna chahte hain? Waqt chunne ke liye BOOK likhein.\n\n${f.disclaimer}`,
    greeting: (name: string, clinic: string, salam: boolean) =>
      en
        ? `Hello${name ? " " + name : ""}! 👋 I'm the virtual assistant for ${clinic}. I can:\n• Book, reschedule or cancel appointments (reply BOOK)\n• Share clinic hours and location\n• Share consultation fees\n• Give preparation guidance\n\n${f.disclaimer}`
        : `${salam ? "Wa alaikum assalam" : "Hello"}${name ? " " + name : ""}! 👋 Main ${clinic} ka virtual assistant hoon. Main yeh kar sakta hoon:\n• Appointment book, reschedule ya cancel (BOOK likhein)\n• Clinic ka waqt aur location batana\n• Fees ki maloomat\n• Visit ki tayyari ki rehnumai\n\n${f.disclaimer}`,
    optout: en
      ? "✅ You will no longer receive messages from us (including appointment reminders). Reply START any time to resume. For emergencies call 1122 or your nearest hospital."
      : "✅ Ab aap ko hamari taraf se koi paigham (appointment ki yaad dehani sameet) nahi bheja jayega. Dobara shuru karne ke liye START likhein. Emergency mein 1122 par call karein ya qareebi hospital jayein.",
    optin: en
      ? "✅ Welcome back! You will receive appointment reminders and replies again. Reply STOP any time to opt out."
      : "✅ Khush aamdeed! Ab aap ko appointment ki yaad dehani aur jawab dobara milte rahenge. Kisi bhi waqt rokne ke liye STOP likhein.",
    human: (doctor: string, phone?: string) =>
      en
        ? `👤 I've alerted ${doctor}'s team. A staff member will reply to you here as soon as possible.${phone ? ` You can also call the clinic on ${phone}.` : ""} For emergencies call your local emergency number.`
        : `👤 Maine ${doctor} ki team ko ittila de di hai. Staff ka koi member jald yahin aap ko jawab dega.${phone ? ` Aap clinic ko ${phone} par call bhi kar sakte hain.` : ""} Emergency mein foran emergency number par call karein.`,
    consentNotice: en
      ? "🔒 By chatting with us you agree to receive replies and appointment reminders/updates on WhatsApp. Reply STOP any time to opt out. Please don't send ID, bank or card numbers here, and share medical reports only at the clinic."
      : "🔒 Yahan chat karne se aap hamare jawabat aur appointment ki yaad dehani/ittilaat WhatsApp par milne ki ijazat dete hain. Rokne ke liye kisi bhi waqt STOP likhein. Barah-e-karam yahan shanakhti card, bank ya card ke number na bhejein, aur medical reports sirf clinic mein dikhayein.",
    sensitiveWarn: en
      ? "⚠️ For your safety I removed an ID/card/account number from your message. Please never share these numbers over WhatsApp."
      : "⚠️ Aap ki hifazat ke liye maine aap ke paigham se shanakhti card/card/account number hata diya hai. Barah-e-karam ye number WhatsApp par kabhi share na karein.",
    slotTaken: en
      ? "Sorry — that slot was just taken by someone else. Reply BOOK and I'll show the next available times."
      : "Maazrat — woh slot abhi kisi aur ne le liya. Agle dastiyab waqt dekhne ke liye BOOK likhein.",
    thanks: en ? "You're welcome! Message us any time. 🙂" : "Shukriya! Kisi bhi waqt paigham karein. 🙂",
    unknown: (doctor: string, emerg: string, phone?: string) =>
      en
        ? `Thanks for your message. I've passed it to ${doctor}'s team and they'll reply as soon as possible. In the meantime I can help with: BOOK (appointments), HOURS, LOCATION, FEES.${phone ? ` Clinic phone: ${phone}.` : ""} For emergencies call ${emerg}.\n\n${f.disclaimer}`
        : `Paigham ka shukriya. Maine isay ${doctor} ki team tak pohancha diya hai, woh jald jawab denge. Is dauran main in mein madad kar sakta hoon: BOOK (appointment), HOURS (waqt), LOCATION (address), FEES.${phone ? ` Clinic ka phone: ${phone}.` : ""} Emergency mein ${emerg} par call karein.\n\n${f.disclaimer}`,
    unsupported: en
      ? "Sorry, I can only read text messages. Please type your question, or reply BOOK to schedule an appointment."
      : "Maazrat, main sirf text paigham parh sakta hoon. Barah-e-karam apna sawal likh kar bhejein, ya appointment ke liye BOOK likhein.",
    doctorConfirmed: (type: string, doctor: string, slot: string) =>
      en
        ? `✅ Your ${type} with ${doctor} on ${slot} is confirmed. Reply RESCHEDULE or CANCEL if plans change.`
        : `✅ Aap ka ${type} ${doctor} ke saath ${slot} par confirm ho gaya hai. Plan badle to RESCHEDULE ya CANCEL likhein.`,
    doctorCancelled: (slot: string) =>
      en
        ? `Your appointment on ${slot} has been cancelled by the clinic. Reply BOOK to pick a new time. We apologise for any inconvenience.`
        : `Clinic ki taraf se aap ki ${slot} ki appointment cancel kar di gayi hai. Naye waqt ke liye BOOK likhein. Takleef ke liye maazrat.`,
    reminder2: (type: string, doctor: string, when: string) =>
      en
        ? `⏰ Reminder: your ${type} with ${doctor} starts in about 2 hours (${when}).\nReply CONFIRM to confirm, RESCHEDULE to pick another time, or CANCEL.`
        : `⏰ Yaad dehani: ${doctor} ke saath aap ka ${type} taqreeban 2 ghantay mein hai (${when}).\nConfirm ke liye CONFIRM, doosra waqt chunne ke liye RESCHEDULE, ya CANCEL likhein.`,
    reminder24: (type: string, doctor: string, when: string) =>
      en
        ? `⏰ Reminder: you have a ${type} with ${doctor} on ${when}.\nReply CONFIRM to confirm, RESCHEDULE to pick another time, or CANCEL.`
        : `⏰ Yaad dehani: ${doctor} ke saath aap ka ${type} ${when} ko hai.\nConfirm ke liye CONFIRM, doosra waqt chunne ke liye RESCHEDULE, ya CANCEL likhein.`,
  };
}

export type Msgs = ReturnType<typeof build>;
const cache: Partial<Record<Lang, Msgs>> = {};
export function msgs(lang: Lang): Msgs {
  return (cache[lang] ??= build(lang));
}
