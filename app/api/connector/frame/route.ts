import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, snapshots, users } from "@/lib/db/schema";

const MAX_FRAME_BASE64_LENGTH = 400_000; // ~300KB JPEG

// Connector-facing: receives the camera's current frame (heartbeat) so the
// dashboard can show a near-live view. Keeps only one live frame per camera.
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

  let body: { cameraCode?: string; frameBase64?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const cameraCode = String(body.cameraCode || "").trim();
  const frame = typeof body.frameBase64 === "string" ? body.frameBase64.trim() : "";
  if (!cameraCode || !frame) {
    return NextResponse.json({ error: "cameraCode ve frameBase64 gerekli." }, { status: 400 });
  }
  if (frame.length > MAX_FRAME_BASE64_LENGTH) {
    return NextResponse.json({ error: "Kare çok büyük." }, { status: 413 });
  }

  const [camera] = await db
    .select({ id: cameras.id, liveSnapshotId: cameras.liveSnapshotId })
    .from(cameras)
    .where(and(eq(cameras.userId, user.id), eq(cameras.code, cameraCode)))
    .limit(1);
  if (!camera) {
    return NextResponse.json({ error: `Kamera bulunamadı: ${cameraCode}` }, { status: 404 });
  }

  const [snapshot] = await db
    .insert(snapshots)
    .values({ userId: user.id, data: frame })
    .returning({ id: snapshots.id });

  await db
    .update(cameras)
    .set({ liveSnapshotId: snapshot.id, liveFrameAt: new Date(), online: true })
    .where(eq(cameras.id, camera.id));

  // Drop the previous live frame so storage stays bounded (one per camera).
  if (camera.liveSnapshotId) {
    await db.delete(snapshots).where(eq(snapshots.id, camera.liveSnapshotId));
  }

  return NextResponse.json({ ok: true });
}
