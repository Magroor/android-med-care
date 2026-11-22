# MedAssist — WhatsApp assistant for doctors

Automates patient queries, triage, appointment booking, reminders and chat history over the
**WhatsApp Business Cloud API**. Mobile-first web app (Next.js + PostgreSQL/Drizzle).

## Guides
- **User manual** (illustrated): `/manual` in the running app. **WhatsApp linking guide**: `/manual/whatsapp-setup`. Both print to PDF. Policy and cost notes: [COMPLIANCE.md](COMPLIANCE.md).

## Features
- **Webhook engine** `GET/POST /api/webhook/whatsapp` — Meta verification handshake, `X-Hub-Signature-256` check, idempotent (message-id dedupe), delivery receipts.
- **Intent + triage engine** (`src/lib/intent.ts`, `src/lib/engine.ts`) — booking / reschedule / cancel / confirm, clinic FAQs, symptoms, medication, preparation, **emergency keywords** (negation-aware: "no chest pain" is not flagged).
- **Booking** — natural dates ("friday 4pm", "15/06 11:15", "tomorrow morning"), timezone/DST-correct, conflict-safe (advisory-lock transaction), YES / numbered slot confirmation, optional doctor approval.
- **Reliability** — outbound queue with exponential backoff + jitter (30s → 1h, 6 attempts), crash-safe claiming, 30s background worker (`src/instrumentation.ts`, also `POST /api/worker/tick` for cron).
- **Reminders** 24h and 2h before, replies CONFIRM / RESCHEDULE / CANCEL.
- **Out-of-hours auto-responder** with hours + emergency helpline.
- **Urgent alerts** — red banner, alert sound, browser notification, unread-urgent counters.
- **Patient hub** — per-phone profile, searchable/filterable timeline, visits, **voice-dictated clinical notes**, manual replies.
- **Calendar sync** — private `.ics` feed (Google / Apple / Outlook).
- **Security** — secrets encrypted with AES-256-GCM (key from `APP_ENCRYPTION_KEY`, or generated into `.data/master.key`), scrypt-hashed PIN + signed session cookie, tokens never returned to the browser, medical disclaimer on automated guidance.

## Connect WhatsApp
1. Meta for Developers → WhatsApp → API Setup: copy *Phone number ID* and a permanent access token; App settings → *App secret*.
2. Paste them in **Settings**. Copy the callback URL + verify token into Meta's webhook config (public HTTPS) and subscribe to `messages`.
3. Until connected the app runs in **simulator mode** (`/simulator`) using the identical pipeline.

> **24-hour rule.** WhatsApp allows free-form replies only within 24h of the patient's last message. Reminders and clinic updates outside that window are sent as **approved templates**: create them in Meta WhatsApp Manager (category *Utility*) using the exact texts shown in **Settings → WhatsApp templates**, then enter their names there. Costs, policy compliance, consent/STOP handling and what you must still do yourself are in [COMPLIANCE.md](COMPLIANCE.md). Put `https://<your-app>/privacy` in your Meta business profile.

## Tests
`npx vitest run` — intent, triage, date parsing, slot conflicts, engine flows, payload parsing, signatures, backoff.

## Production notes
Set `APP_ENCRYPTION_KEY`, `COOKIE_SECURE=true` (behind HTTPS), enable disk/DB encryption at rest on the host, and sign a BAA / follow local health-data regulations (HIPAA / GDPR / DPDP) with your hosting and WhatsApp providers.

## Run locally
```
npm install
npm run dev        # embedded Postgres in .data/pgdata, no setup; open /simulator
npm test
```

## Deploy: Vercel + Neon
1. **Neon**: create a project, copy the **pooled** connection string (`-pooler` host, `?sslmode=require`).
2. **Vercel**: import the repo and add the env vars from `.env.example` (`DATABASE_URL`, `APP_ENCRYPTION_KEY`, `ADMIN_PIN`, `CRON_SECRET`, `VAPID_*`). Build runs `node scripts/migrate.mjs && next build`, so migrations apply on every deploy. The app refuses to start without a DB URL / encryption key, and without a PIN nobody can log in.
3. Open the site, log in with `ADMIN_PIN`, then **Settings**: set a personal PIN, clinic details, fee, and WhatsApp credentials (**App Secret is mandatory in production**; unsigned webhooks are rejected). Paste the callback URL + verify token into Meta and subscribe to `messages`.
4. **Reminders / retry queue need a ticker.** Serverless has no timers. `vercel.json` ships a *daily* cron (the only frequency Hobby allows). For 24h/2h reminders and prompt retries, call `GET https://<your-app>/api/worker/tick` with header `Authorization: Bearer $CRON_SECRET` every 1-5 minutes (cron-job.org, GitHub Actions, or a Vercel Pro cron such as `* * * * *`).

## Install as an app + push alerts (PWA)
Open the site on the doctor's phone, **Install / Add to Home Screen**, then tap **Enable urgent alerts**. Urgent messages and bookings needing approval are pushed even when the app is closed (lock-screen text is generic, with no patient details). On **iPhone/iPad, push only works after Add to Home Screen** (iOS 16.4+). The service worker never caches patient data.

## Languages (Roman Urdu first)
Patients mostly type Roman Urdu, so the app is built for it. Each message's language is auto-detected (Roman Urdu, Urdu script, English) and replies, reminders and doctor-triggered messages (confirm / cancel) are sent in the patient's language. Language is "sticky": a Roman Urdu patient who types one English word ("cancel", "fee") keeps getting Roman Urdu. Default for unknown patients is set in Settings.
Understands phrases like "AJ clinic khula h y ni", "kitne bje aen ge", "kal subah 10 bje appointment chahiye", "haan / ji / theek hai", "nahi aa sakta", "time change karna hai", "fees kitni hai", Urdu-script ("کلینک کھلا ہے؟"), Urdu digits, and emergencies ("seene mein dard", "saans nahi", "بے ہوش") with negation ("seene mein dard nahi hai" is not flagged). Replies to Urdu-script messages are in Roman Urdu. `npm test` runs a 380-message corpus (tests/corpus.ts) in all three languages.

## Production notes
Set `APP_ENCRYPTION_KEY`, `COOKIE_SECURE=true` (behind HTTPS), enable disk/DB encryption at rest on the host, and sign a BAA / follow local health-data regulations (HIPAA / GDPR / DPDP) with your hosting and WhatsApp providers.

## Run locally
```
npm install
npm run dev        # embedded Postgres in .data/pgdata, no setup; open /simulator
npm test
```

## Deploy: Vercel + Neon
1. **Neon**: create a project, copy the **pooled** connection string (`-pooler` host, `?sslmode=require`).
2. **Vercel**: import the repo and add the env vars from `.env.example` (`DATABASE_URL`, `APP_ENCRYPTION_KEY`, `ADMIN_PIN`, `CRON_SECRET`, `VAPID_*`). Build runs `node scripts/migrate.mjs && next build`, so migrations apply on every deploy. The app refuses to start without a DB URL / encryption key, and without a PIN nobody can log in.
3. Open the site, log in with `ADMIN_PIN`, then **Settings**: set a personal PIN, clinic details, fee, and WhatsApp credentials (**App Secret is mandatory in production**; unsigned webhooks are rejected). Paste the callback URL + verify token into Meta and subscribe to `messages`.
4. **Reminders / retry queue need a ticker.** Serverless has no timers. `vercel.json` ships a *daily* cron (the only frequency Hobby allows). For 24h/2h reminders and prompt retries, call `GET https://<your-app>/api/worker/tick` with header `Authorization: Bearer $CRON_SECRET` every 1-5 minutes (cron-job.org, GitHub Actions, or a Vercel Pro cron such as `* * * * *`).

## Install as an app + push alerts (PWA)
Open the site on the doctor's phone, **Install / Add to Home Screen**, then tap **Enable urgent alerts**. Urgent messages and bookings needing approval are pushed even when the app is closed (lock-screen text is generic, with no patient details). On **iPhone/iPad, push only works after Add to Home Screen** (iOS 16.4+). The service worker never caches patient data.

## Languages
The intent engine understands English plus common Roman Urdu / Urdu phrasing ("clinic khula hai?", "kitne bje aen ge", "fees", "seene mein dard"), including Urdu-script emergencies. Replies are in English.

## Production notes
Set a strong `APP_ENCRYPTION_KEY`, enable Neon encryption/backups, and sign a BAA / follow local health-data regulations (HIPAA / GDPR / DPDP) with Vercel, Neon and Meta.

---
Designed & developed by Muhammad Aun
