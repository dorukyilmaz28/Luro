import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, events, snapshots, users } from "@/lib/db/schema";

const SEVERITY_BY_EVENT_TYPE: Record<string, "critical" | "high" | "medium" | "low"> = {
  fire_smoke: "critical",
  person_fall_suspected: "critical",
  restricted_zone_entry: "high",
  unsafe_proximity: "high",
  no_hardhat: "high",
  no_vest: "medium",
  no_safety_vest: "medium",
  no_safety_gloves: "medium",
  no_safety_boots: "medium",
  no_safety_goggles: "medium",
};

const MAX_EVENTS_PER_REQUEST = 100;

type IncomingEvent = {
  eventType?: string;
  confidence?: number;
  timestamp?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

type Body = {
  cameraCode?: string;
  events?: IncomingEvent[];
  // Base64 JPEG of the frame that triggered these events (optional).
  snapshotBase64?: string;
};

const MAX_SNAPSHOT_BASE64_LENGTH = 400_000; // ~300KB of JPEG

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Ingest token gerekli." }, { status: 401 });
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.ingestToken, token)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "Geçersiz ingest token." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const cameraCode = String(body.cameraCode || "").trim();
  if (!cameraCode) {
    return NextResponse.json({ error: "cameraCode gerekli." }, { status: 400 });
  }
  if (!Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json({ error: "events dizisi boş." }, { status: 400 });
  }
  if (body.events.length > MAX_EVENTS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Tek istekte en fazla ${MAX_EVENTS_PER_REQUEST} olay gönderilebilir.` },
      { status: 400 },
    );
  }

  const [camera] = await db
    .select({ id: cameras.id })
    .from(cameras)
    .where(and(eq(cameras.userId, user.id), eq(cameras.code, cameraCode)))
    .limit(1);
  if (!camera) {
    return NextResponse.json({ error: `Kamera bulunamadı: ${cameraCode}` }, { status: 404 });
  }

  let snapshotId: string | null = null;
  const snapshotBase64 = typeof body.snapshotBase64 === "string" ? body.snapshotBase64.trim() : "";
  if (snapshotBase64 && snapshotBase64.length <= MAX_SNAPSHOT_BASE64_LENGTH) {
    const [snapshot] = await db
      .insert(snapshots)
      .values({ userId: user.id, data: snapshotBase64 })
      .returning({ id: snapshots.id });
    snapshotId = snapshot?.id ?? null;
  }

  const rows: (typeof events.$inferInsert)[] = [];
  let skipped = 0;
  for (const item of body.events) {
    const eventType = String(item.eventType || "").trim();
    const severity = SEVERITY_BY_EVENT_TYPE[eventType];
    if (!severity) {
      skipped += 1;
      continue;
    }
    const confidence =
      typeof item.confidence === "number" && item.confidence >= 0 && item.confidence <= 1
        ? item.confidence
        : null;
    const createdAt = item.timestamp ? new Date(item.timestamp) : new Date();
    rows.push({
      cameraId: camera.id,
      eventType,
      severity,
      confidence,
      snapshotId,
      metadata: {
        ...(item.metadata && typeof item.metadata === "object" ? item.metadata : {}),
        ...(item.message ? { message: String(item.message).slice(0, 500) } : {}),
      },
      createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
    });
  }

  if (rows.length > 0) {
    await db.insert(events).values(rows);
    await db.update(cameras).set({ online: true }).where(eq(cameras.id, camera.id));
  }

  return NextResponse.json({ inserted: rows.length, skipped });
}
