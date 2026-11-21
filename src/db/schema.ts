import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  summary: text("summary"),
  lang: text("lang"), // "en" | "ur"; last detected language
  lastIntent: text("last_intent"),
  // JSON: { options: string[]; consultType: string; replaceId?: number }
  pendingJson: text("pending_json"),
  pendingExpiresAt: timestamp("pending_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
});

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    direction: text("direction").notNull(), // 'in' | 'out'
    body: text("body").notNull(),
    intent: text("intent"),
    urgent: boolean("urgent").notNull().default(false),
    read: boolean("read").notNull().default(false),
    source: text("source").notNull().default("whatsapp"), // whatsapp | simulator | auto | doctor | reminder
    waMessageId: text("wa_message_id").unique(),
    // in: received | out: queued | sending | sent | delivered | read | simulated | failed
    status: text("status").notNull().default("received"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("messages_patient_created_idx").on(t.patientId, t.createdAt),
    index("messages_status_idx").on(t.direction, t.status),
  ],
);

export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull().default(30),
    consultType: text("consult_type").notNull().default("consultation"),
    status: text("status").notNull().default("pending"), // pending | confirmed | cancelled | completed | no_show
    patientConfirmed: boolean("patient_confirmed").notNull().default(false),
    reminder24Sent: boolean("reminder_24_sent").notNull().default(false),
    reminder2Sent: boolean("reminder_2_sent").notNull().default(false),
    source: text("source").notNull().default("whatsapp"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("appointments_starts_idx").on(t.startsAt)],
);

export const clinicalNotes = pgTable("clinical_notes", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  source: text("source").notNull().default("typed"), // typed | voice
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
