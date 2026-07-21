import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, users, zones } from "@/lib/db/schema";

// Connector-facing: returns a camera's zones (normalized polygons) for the
// ingest token holder. The connector scales them to the frame before inference.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Ingest token gerekli." }, { status: 401 });
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.ingestToken, token)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "Geçersiz ingest token." }, { status: 401 });
  }

  const cameraCode = new URL(request.url).searchParams.get("cameraCode")?.trim();
  if (!cameraCode) {
    return NextResponse.json({ error: "cameraCode gerekli." }, { status: 400 });
  }

  const [camera] = await db
    .select({ id: cameras.id })
    .from(cameras)
    .where(and(eq(cameras.userId, user.id), eq(cameras.code, cameraCode)))
    .limit(1);
  if (!camera) {
    return NextResponse.json({ zones: [] });
  }

  const rows = await db
    .select({ id: zones.id, name: zones.name, type: zones.type, polygon: zones.polygon })
    .from(zones)
    .where(eq(zones.cameraId, camera.id));

  return NextResponse.json({
    zones: rows.map((z) => ({ zone_id: z.id, name: z.name, type: z.type, polygon: z.polygon })),
  });
}
