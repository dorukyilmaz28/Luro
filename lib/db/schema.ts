import { boolean, index, jsonb, pgEnum, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const severityEnum = pgEnum("severity", ["critical", "high", "medium", "low"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  companyName: text("company_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cameras = pgTable("cameras", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  location: text("location"),
  online: boolean("online").notNull().default(true),
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
