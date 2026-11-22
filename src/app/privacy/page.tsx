import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy Policy — Patient WhatsApp Assistant" };

export default async function PrivacyPage() {
  let clinic = "the clinic";
  let doctor = "the doctor";
  let address = "";
  try {
    const s = await getSettings();
    clinic = s.clinicName || clinic;
    doctor = s.doctorName || doctor;
    address = s.address;
  } catch {
    /* settings unavailable: keep generic wording */
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-sm leading-relaxed text-slate-800">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-1 text-slate-500">{clinic}{address ? ` · ${address}` : ""}</p>

      <h2 className="mt-6 text-lg font-semibold">Who we are</h2>
      <p>{clinic} (&ldquo;we&rdquo;), run by {doctor}, uses WhatsApp to answer patient questions and manage appointments. Part of the replies are sent by an automated assistant; a staff member can take over at any time (write &ldquo;human&rdquo; or &ldquo;doctor se baat&rdquo;).</p>

      <h2 className="mt-6 text-lg font-semibold">What we collect</h2>
      <ul className="list-disc pl-5">
        <li>Your WhatsApp phone number and profile name.</li>
        <li>The messages you send us and our replies.</li>
        <li>Appointment details (date, time, type of visit) and notes made by the doctor.</li>
      </ul>
      <p className="mt-2">Please do not send identity-card, bank or payment-card numbers over WhatsApp. If we detect one in a message we remove it automatically. Share medical reports only at the clinic.</p>

      <h2 className="mt-6 text-lg font-semibold">Why we use it</h2>
      <p>To reply to you, book and remind you of appointments, alert the doctor to urgent messages, and keep a record of your visits. We do not sell your data, use it for advertising, or share one patient&apos;s chat with another.</p>

      <h2 className="mt-6 text-lg font-semibold">Reminders and your consent</h2>
      <p>By messaging us you agree to receive replies and appointment reminders/updates on WhatsApp. Reply <b>STOP</b> at any time and we will stop messaging you (reply <b>START</b> to resume).</p>

      <h2 className="mt-6 text-lg font-semibold">Where your data is stored</h2>
      <p>Messages travel through WhatsApp (Meta). Our records are kept in an encrypted-at-rest cloud database, protected by a PIN-locked dashboard that only clinic staff can open. Secrets such as access tokens are encrypted.</p>

      <h2 className="mt-6 text-lg font-semibold">Your choices</h2>
      <ul className="list-disc pl-5">
        <li>Stop messages: send STOP.</li>
        <li>Ask us to delete your data: tell the clinic staff; we will permanently delete your chats, appointments and notes.</li>
        <li>Ask what we hold about you: contact the clinic.</li>
      </ul>

      <h2 className="mt-6 text-lg font-semibold">Not for emergencies</h2>
      <p>The assistant gives administrative and preliminary guidance only. It is not a diagnosis or a substitute for a doctor. In an emergency call your local emergency number (1122 in Pakistan) or go to the nearest hospital.</p>

      <p className="mt-8 text-center text-xs text-slate-400">Designed &amp; developed by Muhammad Aun</p>
    </main>
  );
}
