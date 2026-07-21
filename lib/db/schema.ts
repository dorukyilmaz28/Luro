import { boolean, index, integer, jsonb, pgEnum, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const severityEnum = pgEnum("severity", ["critical", "high", "medium", "low"]);

export const onboardingStepEnum = pgEnum("onboarding_step", [
  "email_verify",
  "company_info",
  "recommendation",
  "plan",
  "complete",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  companyName: text("company_name"),
  emailVerified: boolean("email_verified").notNull().default(false),
  onboardingStep: onboardingStepEnum("onboarding_step").notNull().default("complete"),
  phone: text("phone"),
  industry: text("industry"),
  companySize: text("company_size"),
  recommendedSolutions: jsonb("recommended_solutions").$type<Record<string, unknown>>(),
  selectedPlan: text("selected_plan"),
  ingestToken: text("ingest_token").unique(),
  alertsEnabled: boolean("alerts_enabled").notNull().default(true),
  lastAlertEmailAt: timestamp("last_alert_email_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    purpose: text("purpose").notNull().default("signup"),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("otp_codes_email_idx").on(table.email)],
);

export const cameras = pgTable(
  "cameras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    location: text("location"),
    rtspUrl: text("rtsp_url"),
    online: boolean("online").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("cameras_user_id_idx").on(table.userId)],
);

export const snapshots = pgTable("snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // JPEG bytes, base64-encoded. Fine at pilot scale; swap for blob storage later.
  data: text("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cameraId: uuid("camera_id").references(() => cameras.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    severity: severityEnum("severity").notNull().default("medium"),
    confidence: real("confidence"),
    imageUrl: text("image_url"),
    snapshotId: uuid("snapshot_id").references(() => snapshots.id, { onDelete: "set null" }),
    // Human-in-the-loop review label: pending | confirmed_violation | dismissed
    reviewStatus: text("review_status").notNull().default("pending"),
    reviewNote: text("review_note"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("events_camera_id_idx").on(table.cameraId), index("events_created_at_idx").on(table.createdAt)],
);

export const proactiveSuggestions = pgTable("proactive_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  cameraId: uuid("camera_id").references(() => cameras.id, { onDelete: "set null" }),
  kind: text("kind").notNull(),
  severity: severityEnum("severity").notNull().default("medium"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
});
