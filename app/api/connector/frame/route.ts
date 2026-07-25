import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, snapshots, users } from "@/lib/db/schema";

// Connector-facing heartbeat: the connector calls this each pass with just the
// camera code to report the camera is online. Live viewing is now done locally
// on the on-site machine (connector "İzle"), so no JPEG is streamed to the cloud.
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

  let body: { cameraCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const cameraCode = String(body.cameraCode || "").trim();
  if (!cameraCode) {
    return NextResponse.json({ error: "cameraCode gerekli." }, { status: 400 });
  }

  const [camera] = await db
    .select({ id: cameras.id, liveSnapshotId: cameras.liveSnapshotId })
    .from(cameras)
    .where(and(eq(cameras.userId, user.id), eq(cameras.code, cameraCode)))
    .limit(1);
  if (!camera) {
    return NextResponse.json({ error: `Kamera bulunamadı: ${cameraCode}` }, { status: 404 });
  }

  await db
    .update(cameras)
    .set({ liveFrameAt: new Date(), online: true, liveSnapshotId: null })
    .where(eq(cameras.id, camera.id));

  // Clean up any leftover live JPEG from the old near-live feature.
  if (camera.liveSnapshotId) {
    await db.delete(snapshots).where(eq(snapshots.id, camera.liveSnapshotId));
  }

  return NextResponse.json({ ok: true });
}
