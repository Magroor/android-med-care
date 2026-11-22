import { Callout, Card, Code, Flow, K, ManualShell, Section, Step, Table } from "@/components/manual/ui";

export const metadata = { title: "MedAssist — WhatsApp Linking Guide" };

const TOC = [
  { id: "need", label: "Before you start (checklist)" },
  { id: "map", label: "The big picture: 8 steps" },
  { id: "app", label: "Step 1 · Create the Meta app" },
  { id: "test", label: "Step 2 · Try the free test number" },
  { id: "connect", label: "Step 3 · Connect MedAssist" },
  { id: "webhook", label: "Step 4 · Link the webhook" },
  { id: "number", label: "Step 5 · Add your real clinic number" },
  { id: "templates", label: "Step 6 · Templates (optional, paid)" },
  { id: "billing", label: "Step 7 · Payment method & limits" },
  { id: "golive", label: "Step 8 · Go-live checklist" },
  { id: "errors", label: "Fixing common errors" },
];

export default function WhatsAppSetupPage() {
  return (
    <ManualShell
      badge="SETUP GUIDE · linking WhatsApp to MedAssist"
      title="Link your clinic’s WhatsApp number"
      subtitle="About 45 minutes the first time. You will create a free Meta app, connect it to MedAssist, and point WhatsApp’s messages at your site. Do the steps in order and tick them off."
      toc={TOC}
      other={{ href: "/manual", label: "← User manual" }}
    >
      {/* need ---------------------------------------------------------- */}
      <Section id="need" n={1} title="Before you start" intro="Have these ready. Nothing here costs money except (optionally) a new SIM.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["👤", "A Facebook account", "Used to sign in to Meta for Developers. Use the doctor’s or clinic owner’s account."],
            ["🏢", "A Meta Business portfolio", "Created for you in step 1 if you do not have one."],
            ["📱", "A clinic phone number", "Must receive an SMS or voice call, and must NOT be active on WhatsApp (see step 5). A new SIM is safest."],
            ["🌐", "Your live MedAssist address", "https://<your-site>.vercel.app, with HTTPS. The app must already be deployed."],
            ["🔑", "MedAssist login", "Your PIN, to open Settings."],
            ["💳", "A payment card (later)", "Meta needs one on file for billing even if you stay in the free tier (step 7)."],
          ].map(([icon, title, text]) => (
            <Card key={title}>
              <p className="text-2xl" aria-hidden>{icon}</p>
              <p className="mt-1 font-semibold text-slate-900">{title}</p>
              <p className="mt-0.5">{text}</p>
            </Card>
          ))}
        </div>
        <Callout kind="danger" title="Keep these secret">
          The <b>access token</b> and <b>App secret</b> are like the keys to your clinic’s WhatsApp. Paste them only into MedAssist Settings. Never send them in a chat, email or screenshot. If one leaks, reset it in Meta and paste the new one.
        </Callout>
      </Section>

      {/* map ----------------------------------------------------------- */}
      <Section id="map" n={2} title="The big picture: 8 steps" intro="Steps 1–4 give you a working test setup. Steps 5–8 move it to your real number.">
        <Flow
          nodes={[
            { icon: "1️⃣", title: "Create app", caption: "Meta for Developers · 5 min", tone: "teal" },
            { icon: "2️⃣", title: "Test number", caption: "Send a hello · 5 min", tone: "teal" },
            { icon: "3️⃣", title: "Connect", caption: "IDs + token into Settings · 10 min", tone: "teal" },
            { icon: "4️⃣", title: "Webhook", caption: "Callback URL + verify · 10 min", tone: "teal" },
          ]}
        />
        <Flow
          nodes={[
            { icon: "5️⃣", title: "Real number", caption: "Verify + register · 15 min", tone: "emerald" },
            { icon: "6️⃣", title: "Templates", caption: "Optional · up to 24 h approval", tone: "amber" },
            { icon: "7️⃣", title: "Billing", caption: "Payment method · 5 min", tone: "amber" },
            { icon: "8️⃣", title: "Go live", caption: "Final checks · 10 min", tone: "emerald" },
          ]}
        />
        <div className="rounded-2xl bg-white p-4 shadow-sm print:shadow-none">
          <p className="mb-3 text-sm font-semibold text-slate-900">How the pieces talk to each other</p>
          <Flow
            nodes={[
              { icon: "📱", title: "Patient", caption: "Sends a WhatsApp message", tone: "slate" },
              { icon: "☁️", title: "Meta Cloud API", caption: "Holds your number and its Phone number ID", tone: "emerald" },
              { icon: "🔗", title: "Webhook", caption: "POSTs the message to /api/webhook/whatsapp (signed with App secret)", tone: "amber" },
              { icon: "🧠", title: "MedAssist", caption: "Replies using your access token", tone: "teal" },
            ]}
          />
        </div>
      </Section>

      {/* app ----------------------------------------------------------- */}
      <Section id="app" n={3} title="Step 1 · Create the Meta app" intro="This is Meta’s container for your WhatsApp connection. It is free.">
        <Step n="1.1" title="Register as a developer" where="developers.facebook.com">
          <p>Sign in with Facebook and accept the developer terms if asked.</p>
        </Step>
        <Step n="1.2" title="Create the app" where="App Dashboard → Create App">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Enter an app name, for example <i>MedAssist Clinic</i>, and your email.</li>
            <li>Choose the use case <K>Connect with customers through WhatsApp</K>, then <K>Next</K>.</li>
            <li>Select your Business portfolio, or create one (use the clinic’s name).</li>
            <li>Continue through the publishing-requirements screen and press <K>Create app</K>.</li>
          </ol>
          <p>You land on <i>Customize use case → Connect on WhatsApp → Quickstart</i>. WhatsApp is added automatically.</p>
        </Step>
        <Step n="1.3" title="Open API Setup" where="Quickstart → Start using the API">
          <p>If asked, pick or create a <b>WhatsApp Business account</b> (Meta now also calls it a “Messaging account”). It already comes with a <b>free test phone number</b>.</p>
        </Step>
      </Section>

      {/* test ---------------------------------------------------------- */}
      <Section id="test" n={4} title="Step 2 · Try the free test number" intro="Prove that WhatsApp works before touching your real number.">
        <Step n="2.1" title="Note two numbers" where="API Setup page">
          <p>Write down the <b>Phone number ID</b> of the test number and the <b>WhatsApp Business account ID</b>. They are long numbers shown under the “From” field.</p>
        </Step>
        <Step n="2.2" title="Send the hello message" where="API Setup → Generate access token → To → Send message">
          <p>Click <K>Generate access token</K>, choose your own phone as <b>To</b> (add and verify it if asked), and click <K>Send message</K>. A <i>hello_world</i> message should arrive on your WhatsApp.</p>
        </Step>
        <Callout kind="info" title="Temporary token">The token on this page expires quickly (hours). It is only for this quick test. In step 3 you will make a permanent one. The test number can only message a small list of numbers that you verify.</Callout>
      </Section>

      {/* connect ------------------------------------------------------- */}
      <Section id="connect" n={5} title="Step 3 · Connect MedAssist" intro="Three values go into MedAssist: Phone number ID, a permanent access token, and the App secret.">
        <Step n="3.1" title="Make a permanent access token" where="business.facebook.com → Business Settings → Users → System users">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Click <K>Add</K>, name it <i>medassist</i>, role <b>Admin</b>.</li>
            <li>Select it, click <K>Assign assets</K>. Add <b>your app</b> (toggle <i>Manage app</i>) and <b>your WhatsApp account</b> (toggle <i>Manage WhatsApp Business accounts</i>), then <K>Assign assets</K>. Reload if they do not show yet.</li>
            <li>Click <K>Generate token</K>, choose your app, and set the expiration to <b>Never</b> if offered.</li>
            <li>Tick: <K>whatsapp_business_messaging</K>, <K>whatsapp_business_management</K>, <K>business_management</K>. Click Generate and copy the token once; Meta will not show it again.</li>
          </ol>
        </Step>
        <Step n="3.2" title="Find the App secret" where="App Dashboard → App settings → Basic → App secret → Show">
          <p>Meta may ask you to confirm your identity. Copy the secret. MedAssist uses it to check that messages really come from WhatsApp.</p>
        </Step>
        <Step n="3.3" title="Paste into MedAssist" where="MedAssist → Settings → WhatsApp Business Cloud API">
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Phone number ID</b> → from step 2.1 (later replaced by your real number’s ID).</li>
            <li><b>Permanent access token</b> → from 3.1.</li>
            <li><b>App secret</b> → from 3.2.</li>
          </ul>
          <p>Press <K>Save credentials</K>. The words “(saved)” appear. The token is stored encrypted and is never shown again.</p>
        </Step>
        <Callout kind="warn" title="Without the App secret">MedAssist refuses WhatsApp messages in production. This protects you from fake messages, so do not skip it.</Callout>
      </Section>

      {/* webhook ------------------------------------------------------- */}
      <Section id="webhook" n={6} title="Step 4 · Link the webhook" intro="This tells WhatsApp where to deliver patient messages.">
        <div className="rounded-2xl bg-white p-4 shadow-sm print:shadow-none">
          <p className="mb-3 text-sm font-semibold text-slate-900">The handshake (happens once, when you press “Verify and save”)</p>
          <Flow
            nodes={[
              { icon: "☁️", title: "Meta", caption: "GET /api/webhook/whatsapp?hub.verify_token=…&hub.challenge=123", tone: "emerald" },
              { icon: "🧠", title: "MedAssist", caption: "Token matches Settings? → answers with the challenge", tone: "teal" },
              { icon: "✅", title: "Verified", caption: "From now on Meta POSTs every message to your site", tone: "emerald" },
            ]}
          />
        </div>
        <Step n="4.1" title="Copy your two values from MedAssist" where="MedAssist → Settings → WhatsApp Business Cloud API">
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Callback URL</b>: <code className="rounded bg-slate-100 px-1">https://your-site.vercel.app/api/webhook/whatsapp</code></li>
            <li><b>Verify token</b>: shown just below it. Tap a field to select all of it, then copy. (<K>Rotate</K> makes a new token; if you rotate, update Meta too.)</li>
          </ul>
        </Step>
        <Step n="4.2" title="Paste them in Meta" where="App Dashboard → WhatsApp → Configuration (or Use cases → Customize → Configuration)">
          <p>Enter the Callback URL and Verify token, press <K>Verify and save</K>. It must say success. The URL must be public HTTPS.</p>
        </Step>
        <Step n="4.3" title="Subscribe to messages" where="Configuration → Webhook fields → Manage">
          <p>Switch <K>messages</K> to <b>Subscribed</b>. This delivers incoming messages and delivery ticks. (Optional extras: <i>message_template_status_update</i> and <i>phone_number_quality_update</i>.)</p>
        </Step>
        <Step n="4.4" title="Test it" where="Your phone → WhatsApp">
          <p>From the verified phone, message the test number: <i>“AJ clinic khula h y ni”</i>. Within a few seconds you should get a Roman Urdu reply, and the chat appears under <b>Chats</b> in MedAssist.</p>
        </Step>
        <Callout kind="tip" title="Nothing arrives?">
          If verification works but messages do not appear, subscribe your app to the account once (replace the placeholders; use your permanent token):
          <div className="mt-2"><Code label="PowerShell">{`curl.exe -X POST "https://graph.facebook.com/v21.0/<WABA_ID>/subscribed_apps" -H "Authorization: Bearer <TOKEN>"`}</Code></div>
        </Callout>
      </Section>

      {/* number -------------------------------------------------------- */}
      <Section id="number" n={7} title="Step 5 · Add your real clinic number" intro="Now replace the test number with your own.">
        <Callout kind="danger" title="The number must NOT be on WhatsApp">
          A number already used in the normal WhatsApp or WhatsApp Business app cannot be registered. In that app go to <K>Settings → Account → Delete my account</K> and wait about 3 minutes. <b>You lose that chat history</b>, so for an existing clinic number consider a new SIM instead. Already using the <b>WhatsApp Business app</b> on this number? The same rule applies: either delete that account (history is lost) or onboard through a Meta partner that supports “coexistence”, which lets the app and the API share one number. Coexistence is not covered by this guide.
        </Callout>
        <Step n="5.1" title="Add the phone number" where="App Dashboard → WhatsApp → API Setup → Add phone number">
          <p>Enter the clinic’s <b>display name</b> (use the real clinic name, for example “Dr. Waqas Clinic”), pick the closest business category, and enter the number with country code (+92…).</p>
        </Step>
        <Step n="5.2" title="Verify ownership" where="SMS or voice call code">
          <p>Meta sends a code by SMS or call. Enter it.</p>
        </Step>
        <Step n="5.3" title="Register the number (required API call)" where="One-time command with your permanent token">
          <p>Meta requires a final registration call that also sets a <b>6-digit two-step PIN</b> that you choose. Write the PIN down safely; you need it to change or delete the number later.</p>
          <Code label="PowerShell">{`curl.exe -X POST "https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>/register" -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d "{\\"messaging_product\\":\\"whatsapp\\",\\"pin\\":\\"123456\\"}"`}</Code>
          <p>Replace <code>123456</code> with your own PIN. A success reply is <code>{`{"success":true}`}</code>. Limit: 10 attempts per 72 hours.</p>
        </Step>
        <Step n="5.4" title="Switch MedAssist to the new number" where="MedAssist → Settings → Phone number ID">
          <p>Copy the <b>Phone number ID</b> of the real number from API Setup, paste it in MedAssist and Save. The token and App secret stay the same.</p>
        </Step>
        <Step n="5.5" title="Fill the business profile" where="WhatsApp Manager → Account tools → Phone numbers → your number → Profile">
          <p>Add address, opening hours, a support phone or email, and your privacy-policy link <code>https://your-site.vercel.app/privacy</code>. Meta requires a way for patients to reach a human.</p>
        </Step>
        <Callout kind="info" title="Display name review">Meta reviews the display name. Use your clinic’s real name. You can still send test messages while it is pending, but you may be limited until it is approved.</Callout>
      </Section>

      {/* templates ----------------------------------------------------- */}
      <Section id="templates" n={8} title="Step 6 · Templates (optional, paid)" intro="Skip this to stay 100% free. Without templates, reminders go out as free text whenever the patient wrote in the last 24 hours.">
        <Step n="6.1" title="Create two templates" where="WhatsApp Manager → Message templates → Create template">
          <ul className="list-disc space-y-1 pl-5">
            <li>Category: <b>Utility</b>. Language: <b>English</b> (Roman Urdu is not a Meta language, so file the Roman Urdu text under English).</li>
            <li>Copy the exact body text and sample values from <b>MedAssist → Settings → WhatsApp templates</b>.</li>
            <li>Names suggested there, for example <code>appointment_reminder_ur</code>. Lowercase and underscores only.</li>
            <li>Approval takes up to 24 hours: <i>In review → Active</i>.</li>
          </ul>
        </Step>
        <Step n="6.2" title="Tell MedAssist" where="Settings → WhatsApp templates">
          <p>Enter each approved template’s name, then tick <K>Allow paid template messages</K> and Save.</p>
        </Step>
        <Callout kind="warn" title="Keep templates transactional">Only reminders and appointment updates. Adding promotions can make Meta re-label the template as Marketing (more expensive, stricter consent).</Callout>
      </Section>

      {/* billing ------------------------------------------------------- */}
      <Section id="billing" n={9} title="Step 7 · Payment method & limits" intro="Required by Meta; with free mode you are normally not charged.">
        <Step n="7.1" title="Add a payment method" where="Business Settings / Billing → Payment methods (also linked from API Setup)">
          <p>Without one, free-form messages after the <b>first 1,000 each month</b> are not delivered. Replies to patients inside 24 hours are free up to that number.</p>
        </Step>
        <Table
          head={["Level", "What you can do", "How to move up"]}
          rows={[
            ["Start", "Message up to ~250 different people (outside the 24-hour window) per day. Replies to patients who write first are not limited this way.", "—"],
            ["Next", "~2,000 per day", "Verify your business (App Dashboard → Settings → Basic → Verification, or in Business Settings), or send many quality template messages."],
          ]}
        />
        <Callout kind="tip" title="Business verification">Not needed to start. It raises limits and the template and number caps. Meta asks for clinic registration documents.</Callout>
      </Section>

      {/* golive -------------------------------------------------------- */}
      <Section id="golive" n={10} title="Step 8 · Go-live checklist" intro="Tick every box before real patients message you.">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "Real number registered, status “Connected” in WhatsApp Manager",
            "Phone number ID in MedAssist matches the real number",
            "Permanent token (never expires) saved, not the temporary one",
            "App secret saved (“saved” label shows)",
            "Webhook verified and “messages” subscribed",
            "Test: message the clinic number, reply in Roman Urdu arrives",
            "Test: send STOP, then START, confirm both work",
            "Clinic name, doctor, hours, fee, address filled in Settings",
            "Personal PIN set (not the setup PIN)",
            "Privacy link added to the WhatsApp profile",
            "Payment method added in Meta",
            "Demo data flushed (Settings → Flush demo data)",
            "Doctor’s phone: installed + “Enable urgent alerts” done",
            "A pinger calls /api/worker/tick every few minutes (reminders)",
          ].map((t) => (
            <label key={t} className="flex gap-2 rounded-xl bg-white p-3 text-sm shadow-sm print:shadow-none">
              <input type="checkbox" className="mt-0.5 h-4 w-4" />
              <span>{t}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* errors -------------------------------------------------------- */}
      <Section id="errors" n={11} title="Fixing common errors" intro="Most problems are one of these.">
        <Table
          head={["You see", "Meaning", "Fix"]}
          rows={[
            ["Meta says “callback URL or verify token couldn’t be validated”", "The site did not answer the handshake", "Check the URL ends with /api/webhook/whatsapp, uses https, the site is deployed, and the verify token is copied exactly from Settings."],
            ["Messages are not appearing in Chats", "Not subscribed, wrong app, or App secret missing", "Subscribe “messages”; run the subscribed_apps command; make sure App secret is saved; app in Live mode if Meta asks."],
            ["Replies show “failed … code 190”", "Access token invalid or expired", "Create a new permanent token (step 3.1) and save it."],
            ["“failed … code 131047”", "24-hour window closed", "Normal for hand-typed replies after a day. Ask the patient to write first."],
            ["“failed … code 132001”", "Template name or language does not exist", "Check the template name and language code in Settings match Meta exactly."],
            ["“failed … code 100” / “Invalid parameter”", "Wrong Phone number ID, or number not registered", "Re-copy the ID; confirm status Connected; do step 5.3."],
            ["“Webhook not configured” (401)", "No App secret saved", "Save the App secret in Settings."],
            ["Number won’t register", "Still active on WhatsApp / wrong PIN attempts", "Delete the WhatsApp account on that number, wait 3 minutes, retry (max 10 per 72 h)."],
            ["Nothing is sent but everything looks right", "Simulator mode (no ID/token saved)", "Save Phone number ID and token; the Home banner stops saying “Simulator”."],
          ]}
        />
        <Callout kind="info" title="Meta changes screens often">
          Menu names can move. If you cannot find a button, search the Meta Business Help Centre for the step’s name, or look at the screen titles shown above the <K>where</K> chips. The values you need never change: Phone number ID, access token, App secret, callback URL and verify token.
        </Callout>
      </Section>
    </ManualShell>
  );
}
