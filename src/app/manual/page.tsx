import { Callout, Card, Flow, K, Legend, ManualShell, Phone, Pin, Section, Step, Table } from "@/components/manual/ui";

export const metadata = { title: "MedAssist — User Manual" };

const TOC = [
  { id: "how", label: "How MedAssist works" },
  { id: "install", label: "Install on your phone & turn on alerts" },
  { id: "home", label: "The Home dashboard" },
  { id: "chats", label: "Chats: reading, replying, notes" },
  { id: "appts", label: "Appointments & calendar" },
  { id: "understands", label: "What the assistant understands" },
  { id: "urgent", label: "Emergencies & urgent alerts" },
  { id: "window", label: "The 24-hour rule & reminders" },
  { id: "consent", label: "STOP / START, privacy & ID numbers" },
  { id: "settings", label: "Settings, explained" },
  { id: "daily", label: "Daily routine checklist" },
  { id: "trouble", label: "Troubleshooting" },
  { id: "urdu", label: "Mukhtasar guide (Roman Urdu)" },
];

export default function ManualPage() {
  return (
    <ManualShell
      badge="USER MANUAL · for the doctor and clinic staff"
      title="MedAssist: your WhatsApp clinic assistant"
      subtitle="Patients message your clinic on WhatsApp. MedAssist answers hours, fees and location, books appointments, flags emergencies to your phone, and keeps every chat in one place. This manual shows you how to use it, with pictures."
      toc={TOC}
      other={{ href: "/manual/whatsapp-setup", label: "Linking guide →" }}
    >
      {/* 1 ------------------------------------------------------------ */}
      <Section id="how" n={1} title="How MedAssist works" intro="You do not have to do anything for routine questions. The assistant handles them and you handle people.">
        <Flow
          nodes={[
            { icon: "📱", title: "Patient", caption: "Writes on WhatsApp in Roman Urdu, Urdu or English", tone: "slate" },
            { icon: "💬", title: "WhatsApp (Meta)", caption: "Delivers the message to your clinic number", tone: "emerald" },
            { icon: "🧠", title: "MedAssist", caption: "Understands it, checks the calendar, writes the reply", tone: "teal" },
            { icon: "✅", title: "Reply & booking", caption: "Patient gets an answer; the slot is saved", tone: "emerald" },
            { icon: "🔔", title: "Your phone", caption: "Urgent messages and approvals ring you", tone: "red" },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Card title="🤖 It handles" tone="teal">Clinic hours, fee, address, booking, rescheduling, cancelling, confirmations, reminders, “what should I bring”.</Card>
          <Card title="🧑‍⚕️ You handle" tone="slate">Emergencies, medical questions, anything the assistant flags for review, approving bookings (if you turn approvals on).</Card>
          <Card title="🛡️ It never" tone="slate">Diagnoses, prescribes, asks for ID or card numbers, or sends marketing messages.</Card>
        </div>
        <Callout kind="info" title="Languages">
          Each patient is answered in the language they write: <b>Roman Urdu</b> (Urdu typed in English letters), Urdu script, or English. A patient who writes mostly Roman Urdu stays in Roman Urdu even if they type one English word.
        </Callout>
      </Section>

      {/* 2 ------------------------------------------------------------ */}
      <Section id="install" n={2} title="Install on your phone & turn on alerts" intro="MedAssist is a web app. Installing it adds an icon to your home screen and lets urgent messages ring your phone even when the app is closed.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Step n={1} title="Open the site" where="Chrome (Android) · Safari (iPhone)">
            <p>Open your MedAssist address and log in with your PIN.</p>
          </Step>
          <Step n={2} title="Install it" where="⋮ menu → Install app / Add to Home screen">
            <p>On iPhone use Share → <K>Add to Home Screen</K>. Push alerts on iPhone only work from the home-screen icon (iOS 16.4 or newer).</p>
          </Step>
          <Step n={3} title="Allow alerts" where="Top bar → 🔔 Enable urgent alerts">
            <p>Tap the button, then <K>Allow</K> when the phone asks. The button disappears once alerts are on.</p>
          </Step>
        </div>
        <Callout kind="tip">Do this on every device you want alerts on (your phone, the receptionist’s phone). Each one is registered separately.</Callout>
      </Section>

      {/* 3 ------------------------------------------------------------ */}
      <Section id="home" n={3} title="The Home dashboard" intro="Your start-of-day screen. Numbers match the pins on the picture.">
        <div className="grid items-start gap-6 md:grid-cols-[300px_1fr]">
          <Phone caption="Home screen (example data)">
            <div className="relative rounded-lg bg-red-600 p-2 text-[11px] text-white">
              <span className="absolute -left-2 -top-2"><Pin n={1} /></span>
              🚨 <b>2 urgent messages</b> — +92 300 1234567: seene mein dard…
            </div>
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-bold">Dr. Waqas</p>
                <p className="text-[10px] text-slate-500">Dr. Waqas Clinic</p>
              </div>
              <span className="relative rounded-full bg-teal-50 px-2 py-0.5 text-[10px] text-teal-800">
                <span className="absolute -right-2 -top-2"><Pin n={2} /></span>Open now
              </span>
            </div>
            <div className="relative grid grid-cols-2 gap-2">
              <span className="absolute -left-2 -top-2 z-10"><Pin n={3} /></span>
              <div className="rounded-xl bg-teal-600 p-2 text-white"><p className="text-xl font-bold">6</p><p className="text-[10px]">Appointments today</p></div>
              <div className="rounded-xl bg-amber-100 p-2 text-amber-900"><p className="text-xl font-bold">1</p><p className="text-[10px]">Pending bookings</p></div>
              <div className="rounded-xl bg-red-600 p-2 text-white"><p className="text-xl font-bold">2</p><p className="text-[10px]">Unread urgent</p></div>
              <div className="rounded-xl bg-white p-2"><p className="text-xl font-bold">48</p><p className="text-[10px] text-slate-500">Messages today</p></div>
            </div>
            <div className="relative rounded-xl bg-white p-2 text-[11px]">
              <span className="absolute -left-2 -top-2"><Pin n={4} /></span>
              <p className="font-semibold">Today’s schedule</p>
              <p className="text-slate-600">10:00 Ali Raza · confirmed</p>
              <p className="text-slate-600">10:30 Bilal · pending</p>
            </div>
            <div className="relative grid grid-cols-5 gap-1 rounded-xl bg-white p-1 text-center text-[9px] text-slate-600">
              <span className="absolute -left-2 -top-3"><Pin n={5} /></span>
              <span>🏠<br />Home</span><span>💬<br />Chats</span><span>📅<br />Calendar</span><span>🧪<br />Simulator</span><span>⚙️<br />Settings</span>
            </div>
          </Phone>
          <Legend
            items={[
              { n: 1, title: "Urgent banner", text: "Red and pulsing. Tap it to open the patient. It also plays an alert sound while the app is open." },
              { n: 2, title: "Clinic status", text: "“Open now” or “After hours”. After hours, patients automatically get a polite closed notice." },
              { n: 3, title: "Today’s numbers", text: "Appointments, bookings waiting for you, unread urgent messages, and message volume." },
              { n: 4, title: "Schedule", text: "Today’s visits in time order. Tap one to open the patient." },
              { n: 5, title: "Bottom tabs", text: "Home, Chats, Calendar, Simulator (practice mode) and Settings. Badges show what needs you." },
            ]}
          />
        </div>
        <Callout kind="info" title="Simulator mode">
          Until WhatsApp is linked, the banner says <i>Simulator mode</i>: replies are stored but not sent anywhere. The <b>Simulator</b> tab lets you pretend to be a patient and see exactly what the assistant would say. Use it to practise, then flush the demo data (Settings → Flush demo data).
        </Callout>
      </Section>

      {/* 4 ------------------------------------------------------------ */}
      <Section id="chats" n={4} title="Chats: reading, replying, notes" intro="Every conversation is saved per patient phone number, oldest to newest.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Step n="💬" title="Open a chat" where="Chats tab → tap a patient">
            <p>The list shows the last message, unread count and a red badge for urgent. Search by name or phone number.</p>
          </Step>
          <Step n="🔎" title="Filter the timeline" where="Inside a chat → All / Patient / Replies / Urgent">
            <p>Show only what the patient said, only what was sent, or only urgent messages. Use the search box to find a word.</p>
          </Step>
          <Step n="✍️" title="Reply yourself" where="Bottom text box → Send">
            <p>Your reply goes straight to the patient’s WhatsApp. Replies are free when the patient wrote within the last 24 hours (see section 8).</p>
          </Step>
          <Step n="🎙" title="Voice or typed notes" where="Notes section → 🎙 Dictate / Save note">
            <p>Speak a short summary after the consultation (works best in Chrome) or type it. Notes are private: they are never sent to the patient.</p>
          </Step>
        </div>
        <Table
          head={["Message status", "Meaning"]}
          rows={[
            [<K key="a">queued</K>, "Waiting to be sent (or being retried automatically)."],
            [<K key="b">sent / delivered / read</K>, "WhatsApp confirmed it. The ticks update by themselves."],
            [<K key="c">simulated</K>, "Simulator mode: stored only, WhatsApp is not linked yet."],
            [<K key="d">skipped</K>, "Free mode: the patient’s 24-hour window was closed, so a paid template was not sent (section 8)."],
            [<K key="e">failed</K>, "Could not be sent. The reason is saved with the message, for example “patient opted out”."],
          ]}
        />
        <Callout kind="warn" title="Deleting data">At the bottom of a chat, “Delete this patient’s data” permanently removes the patient, chats, appointments and notes. It cannot be undone.</Callout>
      </Section>

      {/* 5 ------------------------------------------------------------ */}
      <Section id="appts" n={5} title="Appointments & calendar" intro="The assistant books only slots that are inside your hours, on your working days, and free. Two patients can never get the same slot.">
        <Flow
          nodes={[
            { icon: "🗓", title: "Pending", caption: "Waiting for your approval (only if auto-confirm is OFF)", tone: "amber" },
            { icon: "✅", title: "Confirmed", caption: "Booked. Reminders go out 24 h and 2 h before", tone: "emerald" },
            { icon: "🩺", title: "Completed", caption: "Tap “Mark completed” after the visit", tone: "teal" },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title="Other outcomes">
            <ul className="list-disc space-y-1 pl-4">
              <li><b>No-show</b>: patient did not come.</li>
              <li><b>Cancelled</b>: by the patient (“nahi aa sakta”) or by you. The patient is told in their language.</li>
              <li><b>Rescheduled</b>: the old slot is released automatically.</li>
            </ul>
          </Card>
          <Card title="Add or change by hand">
            <ul className="list-disc space-y-1 pl-4">
              <li><K>+ Add</K> on the Calendar tab books a walk-in or phone patient with the same conflict checks.</li>
              <li>Buttons on each visit: Confirm, Mark completed, No-show, Cancel.</li>
              <li>Confirm / Cancel also notify the patient on WhatsApp.</li>
            </ul>
          </Card>
        </div>
        <Callout kind="tip" title="See it in Google / Apple / Outlook Calendar">
          At the bottom of the Calendar tab, tap <K>Copy feed URL</K> and add it as a calendar subscription. Treat the link like a password.
        </Callout>
      </Section>

      {/* 6 ------------------------------------------------------------ */}
      <Section id="understands" n={6} title="What the assistant understands" intro="Real examples from clinic chats. Spelling mistakes and short forms are fine.">
        <Table
          head={["Patient wants", "Roman Urdu", "English", "Urdu script"]}
          rows={[
            ["Clinic open?", "AJ clinic khula h y ni · kitne bje aen ge", "Are you open today?", "کلینک کھلا ہے؟"],
            ["Fees", "fees kitni hai · kitne paise lagenge", "Doctor consultation fee", "فیس کتنی ہے"],
            ["Location", "clinic kahan hai · location bhej dein", "Location of the clinic", "کلینک کہاں ہے"],
            ["Book", "kal subah 10 bje appointment chahiye", "Book me for Friday 4pm", "کل صبح 10 بجے اپوائنٹمنٹ چاہیے"],
            ["Confirm", "haan · ji · theek hai", "yes · confirm", "جی · ہاں"],
            ["Cancel", "nahi aa sakta · mansookh", "cancel my appointment", "کینسل کر دیں"],
            ["Change time", "time change karna hai · dusra time", "reschedule", "ٹائم تبدیل کرنا ہے"],
            ["Illness / treatment", "thyroid ka illaj karte hain? · bukhar hai", "I have fever since 2 days", "مجھے بخار ہے"],
            ["Medicine", "dawai khatam ho gayi · dose kya hai", "refill my prescription", "دوائی ختم ہو گئی"],
            ["Speak to a person", "doctor se baat karni hai · receptionist", "talk to a human", "عملہ سے بات کرنی ہے"],
            ["Stop messages", "band karo · mat bhejo", "STOP", "بند کریں"],
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title="Dates and times it reads">
            “kal”, “aaj”, “parson”, weekdays (peer, mangal, budh, jumerat, juma, hafta, itwar), “subah / dopahar / shaam”, “4 bje”, “4:30 baje”, “friday 4pm”, “15/06 11:15”.
          </Card>
          <Card title="If it cannot understand">
            The patient gets a polite “I passed it to the team” and the chat is marked for your review. Nothing is lost.
          </Card>
        </div>
      </Section>

      {/* 7 ------------------------------------------------------------ */}
      <Section id="urgent" n={7} title="Emergencies & urgent alerts" intro="Words like chest pain, cannot breathe, bleeding, unconscious (in English, Roman Urdu and Urdu) are treated as urgent.">
        <Flow
          nodes={[
            { icon: "⚠️", title: "Danger words", caption: "“seene mein dard”, “saans nahi”, “behosh”, “severe bleeding”…", tone: "amber" },
            { icon: "📩", title: "Instant safety reply", caption: "Tells the patient to call 1122 / go to hospital now", tone: "red" },
            { icon: "🔔", title: "Alert to you", caption: "Red banner, sound and a push notification", tone: "red" },
            { icon: "🧑‍⚕️", title: "You follow up", caption: "Call the patient; the chat is pinned as urgent", tone: "teal" },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Callout kind="tip" title="Smart about “no”">“seene mein dard nahi hai” or “no chest pain” is <b>not</b> an alarm.</Callout>
          <Callout kind="warn" title="Always answered">Even if you switch auto-reply off, or the patient pressed STOP, the emergency safety reply is still sent.</Callout>
        </div>
        <Callout kind="danger" title="This is not an emergency service">Lock-screen alerts are intentionally generic (“New urgent patient message”) to protect privacy. Check your phone, and keep your normal phone line open for emergencies.</Callout>
      </Section>

      {/* 8 ------------------------------------------------------------ */}
      <Section id="window" n={8} title="The 24-hour rule & reminders" intro="WhatsApp, not MedAssist, decides who can be messaged freely. Understanding this keeps your costs at zero.">
        <div className="rounded-2xl bg-white p-4 shadow-sm print:shadow-none">
          <p className="mb-3 text-sm font-semibold text-slate-900">After each patient message, a 24-hour window opens</p>
          <div className="flex overflow-hidden rounded-xl text-center text-xs font-medium text-white">
            <div className="basis-1/2 bg-emerald-600 p-3">
              <p className="text-sm font-bold">0 – 24 hours</p>
              <p>Normal text replies and reminders<br /><b>FREE</b> (within 1,000 / month)</p>
            </div>
            <div className="basis-1/2 bg-amber-500 p-3">
              <p className="text-sm font-bold">After 24 hours of silence</p>
              <p>Only approved <b>templates</b> are allowed<br /><b>PAID</b> per message</p>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>Patient writes</span><span>↻ every new patient message restarts the clock</span><span>24 h</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title="🆓 Free mode (default)" tone="teal">
            If the patient wrote in the last 24 hours, the 24 h / 2 h reminder goes out as plain text for free. If not, the reminder is marked <K>skipped</K> and nothing is charged. You can call that patient instead.
          </Card>
          <Card title="💳 Paid templates (optional)" tone="slate">
            In Settings → WhatsApp templates tick <i>Allow paid template messages</i>, create the two approved templates in Meta and enter their names. Reminders then also reach patients outside the window, at Meta’s per-message price.
          </Card>
        </div>
        <Callout kind="info" title="What is counted">
          Meta charges only for messages <b>you send</b> that are delivered. Patient messages are free. The first <b>1,000</b> free-form replies each month are free per number; keep a payment method on the Meta account so messages after that are still delivered.
        </Callout>
      </Section>

      {/* 9 ------------------------------------------------------------ */}
      <Section id="consent" n={9} title="STOP / START, privacy & ID numbers" intro="Built-in protections that keep your WhatsApp number in good standing.">
        <Flow
          nodes={[
            { icon: "🔒", title: "First reply", caption: "Includes a short consent note: reminders by WhatsApp, reply STOP any time", tone: "teal" },
            { icon: "✋", title: "Patient sends STOP", caption: "Or “band karo / mat bhejo / بند کریں”", tone: "amber" },
            { icon: "✅", title: "One confirmation", caption: "Then silence: no replies, no reminders, no doctor messages", tone: "slate" },
            { icon: "▶️", title: "START", caption: "Resumes everything", tone: "emerald" },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title="🪪 ID and card numbers are removed">
            If a patient types a CNIC, a bank card or an account number, MedAssist replaces it with “[ID number removed]” <b>before saving</b> and asks the patient not to share it. Meta’s policy forbids collecting these.
          </Card>
          <Card title="📄 Privacy page">
            Your public privacy policy is at <K>/privacy</K> on your site. Add this link to your WhatsApp business profile.
          </Card>
        </div>
        <Callout kind="danger" title="Do not">Send lab reports, ID cards or diagnoses over WhatsApp yourself, run promotions, or message people who have not contacted you. See COMPLIANCE.md for the full list and for the legal point about health data in your country.</Callout>
      </Section>

      {/* 10 ----------------------------------------------------------- */}
      <Section id="settings" n={10} title="Settings, explained" intro="⚙️ tab. The clinic settings share one “Save settings” button; the WhatsApp, templates and security cards each have their own Save button.">
        <Table
          head={["Card", "What to enter", "Why it matters"]}
          rows={[
            ["Clinic", "Clinic name, doctor name, address, emergency number (1122), hours, working days, slot length", "Used in every reply and for booking. Time zone is Asia/Karachi."],
            ["Replies", "Fee and payment methods, visit preparation text, default language, auto-reply on/off, auto-confirm bookings on/off", "Fee text is sent when patients ask. Auto-confirm OFF means you approve each booking."],
            ["WhatsApp Business Cloud API", "Phone number ID, access token, App secret, plus the webhook address and verify token to paste into Meta", "Links your real number. Step-by-step in the linking guide."],
            ["WhatsApp templates", "Free-mode switch, template names, language codes", "Only needed for paid reminders outside 24 hours."],
            ["Security", "Personal PIN, Lock now", "Change the setup PIN to your own on day one."],
            ["Flush demo data", "Type DELETE", "Wipes practice patients before go-live. Settings stay."],
          ]}
        />
      </Section>

      {/* 11 ----------------------------------------------------------- */}
      <Section id="daily" n={11} title="Daily routine checklist" intro="Two minutes in the morning, glance during the day.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card title="🌅 Morning">
            <ul className="list-disc space-y-1 pl-4"><li>Open Home; clear red items first.</li><li>Approve pending bookings.</li><li>Check today’s schedule.</li></ul>
          </Card>
          <Card title="☀️ During the day">
            <ul className="list-disc space-y-1 pl-4"><li>Answer chats marked for review or “human”.</li><li>Tap Mark completed / No-show after visits.</li><li>Dictate a note after each patient.</li></ul>
          </Card>
          <Card title="🌙 Evening">
            <ul className="list-disc space-y-1 pl-4"><li>Look at tomorrow’s Calendar.</li><li>Clear unread urgent items.</li><li>Phone: keep notifications allowed.</li></ul>
          </Card>
        </div>
      </Section>

      {/* 12 ----------------------------------------------------------- */}
      <Section id="trouble" n={12} title="Troubleshooting" intro="Find the symptom, try the fix.">
        <Table
          head={["Symptom", "Likely cause", "Fix"]}
          rows={[
            ["Patients message but nothing appears", "Webhook not linked or not subscribed to “messages”", "Follow the linking guide, step “Webhook”. Check the App secret is saved."],
            ["Patients get no replies", "Auto-reply off, patient pressed STOP, or token expired", "Settings → auto-reply on. Open the chat: a red “failed” reason tells you. Re-create the access token if it says code 190."],
            ["“Outside the 24-hour window”", "You replied by hand after a day of silence", "Ask the patient to message first, or call them. Templates are only for reminders and updates."],
            ["Reminders show “skipped”", "Free mode and the patient had not written for 24 h", "Expected. Call the patient, or enable paid templates."],
            ["No alert sound / push", "Alerts not allowed, app not installed (iPhone), browser blocked", "Re-do section 2. On iPhone install to the Home Screen first."],
            ["Login says “Too many attempts”", "5 wrong PINs", "Wait 10 minutes. Forgot PIN: an administrator can reset it in Vercel (ADMIN_PIN) and Settings."],
            ["Wrong time on bookings", "Time zone", "Settings → Time zone should be Asia/Karachi."],
            ["First request is slow in the morning", "Free database sleeps when idle", "Normal. It wakes in a second or two."],
          ]}
        />
      </Section>

      {/* 13 ----------------------------------------------------------- */}
      <Section id="urdu" n={13} title="Mukhtasar guide (Roman Urdu)" intro="Aasan lafzon mein poori kahani.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title="Roz ka kaam">
            <ul className="list-disc space-y-1 pl-4">
              <li>Home kholein: laal (urgent) cheezein pehle dekhein.</li>
              <li>Pending bookings ko Confirm ya Cancel karein.</li>
              <li>Mareez ke baad “Mark completed” dabayein aur note likhein ya bol kar likhwayein.</li>
            </ul>
          </Card>
          <Card title="Assistant khud kya karta hai">
            <ul className="list-disc space-y-1 pl-4">
              <li>Clinic ka waqt, fees aur address batata hai.</li>
              <li>Appointment book / badalta / cancel karta hai.</li>
              <li>Emergency par foran mareez ko 1122 batata hai aur aap ko alert bhejta hai.</li>
            </ul>
          </Card>
          <Card title="24 ghantay ka usool">
            Mareez ka paigham aane ke baad 24 ghantay tak jawab aur yaad dehani <b>muft</b> hain. Uske baad sirf paid template chalta hai. Default mein paid template band hai, is liye koi kharcha nahi.
          </Card>
          <Card title="Zaroori ehtiyat">
            Mareez se CNIC, card ya bank number na mangein. Reports clinic mein dekhein. Mareez “STOP / band karo” likhe to uski marzi ka ehteram karein; app khud ruk jati hai.
          </Card>
        </div>
      </Section>
    </ManualShell>
  );
}
