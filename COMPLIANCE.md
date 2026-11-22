# WhatsApp / Meta compliance notes

Checked against Meta's official pages on 2026-11-22: the
[WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/) (last updated 2026-09-23),
the [Meta Terms for the WhatsApp Business Platform](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform) (2026-09-23),
the [opt-in guide](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in) and the
[pricing page](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing).
Meta changes these often and decides enforcement "in its sole discretion". Re-check before go-live. This is not legal advice.

## What the app does to stay within the rules

| Meta rule | What MedAssist does |
|---|---|
| Free-form text only inside the 24h window; otherwise approved templates only | Every send is planned (`planSend`): text inside the window, an approved **template** outside it, or a clear failure (never a blind API call). Templates for reminders and clinic updates, in English and Roman Urdu (Settings → WhatsApp templates). |
| Opt-in is required before messaging; opt-outs must be honoured | First reply to every new patient carries a consent notice. **STOP / band karo / روکیں** records an opt-out, confirms once, and silences all automation, reminders and doctor messages. **START** resumes. Emergency safety replies are still sent. |
| Don't share or request ID-card, payment-card or account numbers | CNIC, card (Luhn-checked) and IBAN-style numbers are **removed before storage**; the patient gets a warning. The bot never asks for them. |
| Automation allowed, but needs a clear escalation path | "human / receptionist / doctor se baat karni hai" alerts the doctor (push) and tells the patient a staff member will reply. Unknown messages are flagged for staff review. |
| Maintain a published privacy policy; get consent to collect/share content | Public page at `/privacy` (put its URL in your Meta business profile). Consent notice as above. |
| Don't forward one customer's chat to another / don't misuse WhatsApp data | Chats are shown only in the PIN-locked dashboard; nothing is shared or used for profiling. |
| Don't mislead people | The assistant introduces itself as a virtual assistant and every medical reply carries a "not a diagnosis" disclaimer. |
| Quality: users can block/report; low quality limits sending | Replies only to patients who wrote first; reminders only for booked appointments; no marketing messages at all. |
| AI Providers rule (Terms 4.7: no general-purpose AI assistants as the primary offering) | Not applicable: the bot is a rule-based clinic assistant with no LLM. If you ever add an LLM, re-read 4.7. |

Template category: submit both templates as **Utility** (transactional: reminders/updates). Do not add promotions to them, or Meta may re-categorise them as Marketing (higher price, stricter opt-in).

## Things only you can decide / do

1. **Health data and local law (most important).** Policy §3: "Don't use WhatsApp for telemedicine or to send or request any health related information" **where applicable regulations prohibit sending it to systems that don't meet heightened requirements**. Meta's Terms say the platform "is not HIPAA compliant", Meta is not a Business Associate and offers no BAA. Whether Pakistani law (or your patients' countries' laws) restricts this is a legal question. Get advice. Practical mitigations already built in: the bot never asks for symptoms, reports or IDs; replies are administrative; medical reports are to be shown at the clinic; patient data can be deleted. Avoid sending lab reports or diagnoses over WhatsApp yourself.
2. **Opt-in evidence.** Meta's docs do not say that a patient messaging first counts as opt-in for later template messages. The consent notice plus STOP is a reasonable approach; also tell patients at the clinic desk (and on your sign/website) that reminders go via WhatsApp, and keep a note of it.
3. **Business profile.** Fill in support contact details (phone/email/website) and the `/privacy` URL in WhatsApp Manager; keep display name consistent with the clinic.
4. **Under-18s.** Regulated-vertical messaging must not target under-18s; don't run campaigns.
5. **Never use the number for marketing/promotions** without separate marketing opt-in and templates.

## Costs (pricing page, effective 2026-10-01)

- Charged per **delivered business-to-user message**; patient-to-business messages are free.
- **Service messages** (free-form replies inside the 24h window): **1,000 free per month per phone number**; from the 1,001st they are charged. **Add a payment method in Meta Business Manager**: without one, messages after the free tier are *not delivered*.
- **Utility templates** (reminders, updates) are charged per message, **including inside an open window since 2026-10-01**. No free allowance. Pakistan is a separate rate-card market; see the rate card (CSV/PDF) linked on the pricing page for the exact per-message price.
- Marketing and authentication templates are charged too (not used by this app).
- Rates can change only on Jan 1 / Apr 1 / Jul 1 / Oct 1, with notice.

A small clinic (say 100 appointments a month, 2 reminders each) means roughly 200 utility templates a month plus replies under the 1,000 free tier.

## Data handling checklist

- Encrypted secrets (AES-256-GCM), encrypted-at-rest Neon database, PIN login with DB-backed throttling, signed webhooks, HTTPS only.
- Patient deletion: Patients → open a patient → "Delete this patient's data", or Settings → "Flush demo data" for everything.
- Keep backups according to your own retention policy; Neon branches/backups also hold patient data.
