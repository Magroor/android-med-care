// Patient message corpus: [text, expected intent]. en = English, ru = Roman Urdu, ur = Urdu script.
export type Row = [text: string, intent: string];

export const GREETING: Row[] = [
  // en
  ["Hello", "greeting"], ["Hi", "greeting"], ["Hello sir", "greeting"], ["Hey doctor", "greeting"], ["Good morning", "greeting"],
  ["Good evening doctor", "greeting"], ["hii", "greeting"], ["Hello doctor, how are you", "greeting"],
  // ru
  ["Assalamualaikum", "greeting"], ["Asslamoalikum", "greeting"], ["Assalam o alaikum", "greeting"], ["Assalamu alaikum", "greeting"],
  ["Salam", "greeting"], ["salam doctor sahb", "greeting"], ["Aoa", "greeting"], ["Assalam o alaikum sir", "greeting"],
  ["assalamualaikum doctor sahib", "greeting"], ["Slam", "greeting"], ["Asalam o alikum", "greeting"], ["ASSALAMUALAIKUM!!", "greeting"],
  // ur
  ["السلام علیکم", "greeting"], ["اسلام علیکم", "greeting"], ["السلام علیکم ڈاکٹر صاحب", "greeting"], ["سلام", "greeting"],
  ["السلام علیکم سر", "greeting"], ["سلام ڈاکٹر صاحب", "greeting"], ["ہیلو", "greeting"], ["ہیلو ڈاکٹر", "greeting"],
];

export const HOURS: Row[] = [
  // en
  ["What are your clinic hours?", "hours"], ["Are you open today?", "hours"], ["When do you open?", "hours"], ["What time do you close?", "hours"],
  ["Clinic timings please", "hours"], ["Is the doctor available at clinic now?", "hours"], ["Doctor sahb are you available at clinic now?", "hours"],
  ["are you open on sunday", "hours"], ["Opening hours?", "hours"], ["what are the working days", "hours"], ["timings?", "hours"], ["Are you available at the clinic today?", "hours"],
  // ru
  ["Kitne bje Ayn ge clinic", "hours"], ["Ap Ayn hen clinic", "hours"], ["Ap 5 bje tk aa jyn ge sir", "hours"], ["AJ clinic h on?", "hours"],
  ["AJ h clinic timing bta dn", "hours"], ["AJ clinic khula h y ni", "hours"], ["Aye ni ap clinic", "hours"], ["Dr sab ap ny aj Kitne bjy bethna hy bwp", "hours"],
  ["clinic khula hai?", "hours"], ["clinic kitne bje khulta hai", "hours"], ["clinic kab tak khula hai", "hours"], ["aaj clinic khula hai ya band", "hours"],
  ["timing bata dein", "hours"], ["clinic ki timing kya hai", "hours"], ["Kitne bje tak clinic khula hota hai", "hours"], ["aj clinic open h?", "hours"],
  ["doctor sahib kab tak baithte hain", "hours"], ["Kal clinic khula hoga?", "hours"], ["clinic timing bta dein", "hours"], ["sir kitne bje aen ge", "hours"],
  ["Ap kitne bje tak clinic mein hain", "hours"], ["clinic khulla h", "hours"],
  // ur
  ["کلینک کھلا ہے؟", "hours"], ["آج کلینک کھلا ہے", "hours"], ["کلینک کی ٹائمنگ بتا دیں", "hours"], ["کتنے بجے آئیں گے", "hours"],
  ["کلینک کب تک کھلا ہے", "hours"], ["ڈاکٹر صاحب کتنے بجے بیٹھتے ہیں", "hours"], ["کل کلینک کھلا ہوگا؟", "hours"], ["کلینک کا ٹائم کیا ہے", "hours"],
  ["کلینک کھلی ہے کیا", "hours"], ["آپ کب تک کلینک میں ہیں", "hours"], ["کلینک کی ٹائمنگ", "hours"], ["آج کلینک کھلا ہے یا بند", "hours"],
];

export const LOCATION: Row[] = [
  ["Location of the clinic", "location"], ["Where is the clinic?", "location"], ["Clinic address please", "location"], ["How to reach the clinic", "location"],
  ["send location", "location"], ["Is there parking?", "location"], ["directions to the clinic", "location"], ["address?", "location"],
  ["clinic kahan hai", "location"], ["clinic ka address bata dein", "location"], ["location bhej dein", "location"], ["clinic kidhar hai", "location"],
  ["Clinic kaha h", "location"], ["address kya hai", "location"], ["location send karein", "location"], ["clinic ki location", "location"],
  ["کلینک کہاں ہے", "location"], ["کلینک کا پتہ بتا دیں", "location"], ["ایڈریس بھیج دیں", "location"], ["لوکیشن بھیجیں", "location"],
  ["کلینک کا ایڈریس کیا ہے", "location"], ["کلینک کہاں پر ہے", "location"], ["پتہ بتائیں", "location"], ["لوکیشن", "location"],
];

export const FEE: Row[] = [
  ["Doctor consultation fee", "fee"], ["What is the consultation fee?", "fee"], ["How much do you charge", "fee"], ["fees?", "fee"],
  ["What is the consultation fee and payment method?", "fee"], ["how much is the cost of a visit", "fee"], ["what are your charges", "fee"], ["price of consultation", "fee"],
  ["fees kitni hai", "fee"], ["Doctor ki fees kitni hai", "fee"], ["consultation fee kitni hai", "fee"], ["kitne paise lagenge", "fee"],
  ["fee btaye", "fee"], ["charges kya hain", "fee"], ["fees kitni hy", "fee"], ["kitne paise hain", "fee"], ["check up ki fees?", "fee"], ["payment kese karni hai", "fee"], ["fees", "fee"], ["Online ki fees kitni hai", "fee"],
  ["فیس کتنی ہے", "fee"], ["ڈاکٹر کی فیس کتنی ہے", "fee"], ["فیس بتا دیں", "fee"], ["کتنے پیسے لگیں گے", "fee"],
  ["چیک اپ کی فیس کتنی ہے", "fee"], ["آن لائن کنسلٹیشن کی فیس", "fee"], ["ادائیگی کیسے کرنی ہے", "fee"], ["فیس؟", "fee"],
];

export const BOOKING: Row[] = [
  // en
  ["I need to book an appointment", "booking"], ["I want to see the doctor", "booking"], ["Can I get an appointment tomorrow?", "booking"],
  ["Book me for friday 4pm", "booking"], ["Do you also provide online consultation?", "booking"], ["I need medical consultation", "booking"],
  ["Online consultation", "booking"], ["How can an online appointment be booked?", "booking"], ["And what are the available time slots?", "booking"],
  ["Anytime for today or tomorrow ? I have meetings at 6 pm", "booking"], ["appointment please", "booking"], ["I'd like to schedule a check-up", "booking"],
  ["any slot available tomorrow morning?", "booking"], ["can I visit the doctor on monday", "booking"], ["need a video consultation", "booking"], ["tomorrow 5pm", "booking"],
  // ru
  ["appointment chahiye", "booking"], ["kal subah 10 bje appointment chahiye", "booking"], ["Dr sahib Suba ka time mil jay ga dahranwala se ana hy check karwany", "booking"],
  ["doctor sahab se milna hai", "booking"], ["mujhe doctor ko dikhana hai", "booking"], ["appointment book kar dein", "booking"], ["kal ka time mil sakta hai?", "booking"],
  ["aaj shaam appointment hai?", "booking"], ["parson 4 bje ka time chahiye", "booking"], ["online consultation karni hai", "booking"], ["check up karwana hai", "booking"],
  ["juma ko appointment chahiye", "booking"], ["peer ko ana hai check karwany", "booking"], ["I need to book appointment kal", "booking"], ["booking karni hai", "booking"],
  ["kal dopahar ka slot hai?", "booking"], ["appointment lena hai", "booking"], ["video consultation book karni hai", "booking"], ["kal 5 bje", "booking"], ["mangal ko 11 bje ana hai", "booking"],
  ["appointment kese milegi", "booking"], ["subah ka time chahiye", "booking"],
  // ur
  ["اپوائنٹمنٹ چاہیے", "booking"], ["کل صبح 10 بجے اپوائنٹمنٹ چاہیے", "booking"], ["ڈاکٹر صاحب سے ملنا ہے", "booking"], ["چیک اپ کروانا ہے", "booking"],
  ["آن لائن کنسلٹیشن کرنی ہے", "booking"], ["کل کا ٹائم مل جائے گا؟", "booking"], ["اپوائنٹمنٹ بک کر دیں", "booking"], ["پرسوں 4 بجے", "booking"],
  ["جمعہ کو اپوائنٹمنٹ چاہیے", "booking"], ["آج شام کا سلاٹ دستیاب ہے؟", "booking"], ["مجھے ڈاکٹر کو دکھانا ہے", "booking"], ["بکنگ کرنی ہے", "booking"],
  ["صبح کا ٹائم مل جائے گا", "booking"], ["پیر کو آنا ہے چیک اپ کروانا ہے", "booking"],
];

export const CANCEL: Row[] = [
  ["cancel", "cancel"], ["Please cancel my appointment", "cancel"], ["I can't come tomorrow", "cancel"], ["I won't be able to come", "cancel"], ["cancel my booking", "cancel"], ["I cannot come, cancel it", "cancel"],
  ["cancel kar dein", "cancel"], ["mansookh", "cancel"], ["nahi aa sakta", "cancel"], ["nahi aa sakti kal", "cancel"], ["appointment cancel kar do", "cancel"], ["cancel kardo please", "cancel"], ["main nahi aa sakta cancel", "cancel"], ["nhi aa sakta", "cancel"],
  ["کینسل کر دیں", "cancel"], ["اپوائنٹمنٹ منسوخ کر دیں", "cancel"], ["نہیں آ سکتا", "cancel"], ["نہیں آ سکتی", "cancel"], ["کینسل", "cancel"],
];

export const RESCHEDULE: Row[] = [
  ["reschedule", "reschedule"], ["please reschedule my appointment", "reschedule"], ["can I change my appointment time", "reschedule"], ["move my appointment", "reschedule"], ["another time please", "reschedule"], ["I need to postpone", "reschedule"],
  ["time change karna hai", "reschedule"], ["dusra time chahiye", "reschedule"], ["koi aur din de dein", "reschedule"], ["waqt badal do", "reschedule"], ["aur time dikhao", "reschedule"], ["din badal dein", "reschedule"], ["time badal dein", "reschedule"], ["reschedule karna hai", "reschedule"],
  ["ٹائم تبدیل کرنا ہے", "reschedule"], ["کوئی اور دن دے دیں", "reschedule"], ["دوسرا ٹائم چاہیے", "reschedule"], ["ری شیڈول کر دیں", "reschedule"],
];

export const CONFIRM: Row[] = [
  ["yes", "confirm"], ["Yes please", "confirm"], ["ok", "confirm"], ["okay", "confirm"], ["confirm", "confirm"], ["sure", "confirm"], ["done", "confirm"],
  ["haan", "confirm"], ["ji", "confirm"], ["jee", "confirm"], ["Ji haan", "confirm"], ["theek hai", "confirm"], ["thik hai", "confirm"], ["haan ji", "confirm"], ["confirm kar do", "confirm"], ["bilkul", "confirm"], ["zaroor", "confirm"], ["ok ji", "confirm"], ["g", "confirm"], ["kar do", "confirm"],
  ["جی", "confirm"], ["ہاں", "confirm"], ["جی ہاں", "confirm"], ["ٹھیک ہے", "confirm"], ["ہاں جی", "confirm"], ["بالکل", "confirm"], ["کنفرم", "confirm"],
];

export const THANKS: Row[] = [
  ["thanks", "thanks"], ["Thank you", "thanks"], ["Thank you for reply ...", "thanks"], ["thx doctor", "thanks"], ["thank you so much", "thanks"],
  ["shukriya", "thanks"], ["Shukria doctor sahb", "thanks"], ["jazakallah", "thanks"], ["Jazak Allah khair", "thanks"], ["bohat shukriya", "thanks"], ["meherbani", "thanks"],
  ["شکریہ", "thanks"], ["بہت شکریہ", "thanks"], ["جزاک اللہ", "thanks"], ["شکریہ ڈاکٹر صاحب", "thanks"], ["مہربانی", "thanks"],
];

export const SYMPTOMS: Row[] = [
  ["I have fever since 2 days", "symptoms"], ["bad headache and nausea", "symptoms"], ["I have a cough and sore throat", "symptoms"], ["my child has a rash", "symptoms"], ["I feel dizzy and tired", "symptoms"],
  ["stomach pain after eating", "symptoms"], ["I have diabetes, can you treat it", "symptoms"], ["feeling unwell", "symptoms"], ["there is swelling in my leg", "symptoms"], ["my sugar is high", "symptoms"],
  ["Thyroid ka pasant he app illaj karate ho", "symptoms"], ["mujhe bukhar hai", "symptoms"], ["sar dard hai bohat", "symptoms"], ["pait dard hai", "symptoms"], ["khansi aur bukhar hai", "symptoms"],
  ["sugar ka illaj hota hai?", "symptoms"], ["thyroid ka treatment karte hain?", "symptoms"], ["bacche ko bukhar hai", "symptoms"], ["mujhe chakkar aa rahe hain dizzy", "symptoms"], ["gale mein dard hai", "symptoms"],
  ["meri sugar high hai", "symptoms"], ["blood pressure high rehta hai", "symptoms"], ["ilaj ho jata hai kya", "symptoms"], ["thyroid", "symptoms"], ["pait mein dard", "symptoms"], ["bukhar", "symptoms"],
  ["مجھے بخار ہے", "symptoms"], ["سر درد ہے", "symptoms"], ["تھائرائیڈ کا علاج کرتے ہیں؟", "symptoms"], ["شوگر کا علاج", "symptoms"], ["پیٹ درد ہے", "symptoms"],
  ["کھانسی اور بخار ہے", "symptoms"], ["بلڈ پریشر ہائی رہتا ہے", "symptoms"], ["بچے کو بخار ہے", "symptoms"],
];

export const MEDICATION: Row[] = [
  ["what is the dose of this medicine", "medication"], ["can I take this tablet after food", "medication"], ["I need a prescription refill", "medication"], ["my medication timing", "medication"], ["which syrup should I give", "medication"], ["missed a dose what to do", "medication"],
  ["dawai ka dose kya hai", "medication"], ["meri dawai khatam ho gayi", "medication"], ["ye dawai kab leni hai", "medication"], ["goli khane ka time", "medication"], ["dawai refill chahiye", "medication"], ["nuskha bhej dein", "medication"],
  ["دوائی کب لینی ہے", "medication"], ["دوا ختم ہو گئی ہے", "medication"], ["گولی کھانے کا وقت", "medication"], ["دوائی کا ڈوز", "medication"],
];

export const PREPARATION: Row[] = [
  ["Do I need fasting before the test?", "preparation"], ["what should I bring", "preparation"], ["what do I carry for the visit", "preparation"], ["preparation for the appointment", "preparation"], ["fast before the test?", "preparation"],
  ["test se pehle fasting karni hai?", "preparation"], ["kya saath lana hai", "preparation"], ["parhez kya karna hai", "preparation"], ["fasting required hai?", "preparation"],
  ["ٹیسٹ سے پہلے پرہیز کرنا ہے؟", "preparation"], ["کیا ساتھ لانا ہے", "preparation"],
];

export const EMERGENCY: Row[] = [
  ["I have severe chest pain", "emergency"], ["my father can't breathe", "emergency"], ["she is unconscious", "emergency"], ["heavy bleeding after the procedure", "emergency"], ["EMERGENCY please help", "emergency"], ["I think I'm having a stroke", "emergency"],
  ["He had a seizure", "emergency"], ["vomiting blood", "emergency"], ["I took an overdose", "emergency"], ["trouble breathing since morning", "emergency"], ["my child is choking", "emergency"], ["severe allergic reaction", "emergency"],
  ["seene mein dard hai", "emergency"], ["saans nahi aa rahi", "emergency"], ["meri walida behosh ho gayi", "emergency"], ["dil ka daura lag raha hai", "emergency"], ["bohat khoon beh raha hai", "emergency"], ["seene me dard ho raha hai", "emergency"],
  ["ammi behosh hain jaldi bataiye", "emergency"], ["bache ko saans nahi aa rahi", "emergency"], ["zyada khoon beh raha hai", "emergency"], ["mujhe dil ka daura pada hai", "emergency"], ["abu behosh ho gaye", "emergency"], ["bohat khoon nikal raha hai", "emergency"],
  ["appointment chahiye mujhe saans nahi aa rahi", "emergency"], ["sine me dard bohat zyada", "emergency"],
  ["سینے میں درد ہے", "emergency"], ["سانس نہیں آ رہی", "emergency"], ["امی بے ہوش ہو گئی ہیں", "emergency"], ["دل کا دورہ پڑ گیا", "emergency"], ["بہت خون بہہ رہا ہے", "emergency"],
  ["ابو بیہوش ہو گئے", "emergency"], ["سینے میں شدید درد", "emergency"], ["مریض کو سانس لینے میں دشواری", "emergency"], ["فالج کا دورہ", "emergency"], ["ہنگامی صورتحال ہے", "emergency"],
];

/** Mention a danger word but negate it: must NOT be flagged urgent. */
export const NEGATED: string[] = [
  "I have no chest pain, just a cough", "this is not an emergency", "no bleeding or fever, just a checkup", "she did not faint",
  "seene mein dard nahi hai", "seene me dard nhi", "saans ka koi masla nahi, bas appointment chahiye", "behosh nahi hui bas chakkar aaye",
  "سینے میں درد نہیں ہے", "سانس کا مسئلہ نہیں", "بیہوش نہیں ہوئی",
];

export const UNKNOWN: string[] = [
  "I'm Jawad", "ok then what", "???", "😀", "🙏", ".", "asdfghj", "hmm", "👍", "mera naam Jawad hai", "میرا نام جاوید ہے", "",
];

export const ALL: Row[] = [
  ...GREETING, ...HOURS, ...LOCATION, ...FEE, ...BOOKING, ...CANCEL, ...RESCHEDULE, ...CONFIRM, ...THANKS, ...SYMPTOMS, ...MEDICATION, ...PREPARATION, ...EMERGENCY,
];

/** Doctor -> patient messages (manual replies), all three languages. */
export const DOCTOR_REPLIES: string[] = [
  "Walaikum assalam, kal subah 10 bje aa jayein", "Ji aa jayein, clinic khula hai", "Aaj clinic 5 bje tak khula hai", "Fees 1500 rupay hain", "Online consultation 1000 rupay mein hogi, JazzCash par bhej dein",
  "Aap ka number kal subah 10 bje hai", "Please bring your old reports", "Your appointment is confirmed for tomorrow 10am", "Clinic is closed on Sunday, please visit on Monday", "Fee is Rs 1500, payment via JazzCash/Easypaisa",
  "I will call you in 10 minutes", "Take the medicine after meals", "Dawai khane ke baad lein", "Report le kar aa jayein", "Sugar ka test fasting mein karwa lein",
  "Thyroid ka illaj mumkin hai, aa kar dikha dein", "Fori emergency mein 1122 par call karein", "Appointment kal shaam 6 bje ki hai", "Kal clinic band hai, parson aa jayein", "Please send your lab report picture",
  "وعلیکم السلام، کل صبح 10 بجے آ جائیں", "جی آ جائیں، کلینک کھلا ہے", "آج کلینک 5 بجے تک کھلا ہے", "فیس 1500 روپے ہے", "آن لائن کنسلٹیشن 1000 روپے میں ہوگی",
  "اتوار کو کلینک بند ہوتا ہے، کل آ جائیں", "دوائی کھانے کے بعد لیں", "رپورٹس ساتھ لے آئیں", "ایمرجنسی میں 1122 پر کال کریں", "آپ کی اپوائنٹمنٹ کل شام 6 بجے ہے",
  "Mixed: Please kal aa jayein with reports 🙏", "Line one\nLine two\nLine three", "A".repeat(3900),
];

export const DOCTOR_NOTES: string[] = [
  "BP 120/80, thyroid follow-up in 2 weeks", "Sugar fasting 140, continue metformin", "Patient ko bukhar 3 din se hai, antibiotics di", "TSH test likha, 2 hafte baad follow-up",
  "مریض کو بخار ہے، دوائی دی گئی", "بلڈ پریشر نارمل، اگلا چیک اپ ایک ماہ بعد",
];
