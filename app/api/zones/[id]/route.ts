import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, zones } from "@/lib/db/schema";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

  const { id } = await params;

  // Only delete a zone whose camera belongs to the session user.
  const owned = db
    .select({ id: cameras.id })
    .from(cameras)
    .where(and(eq(cameras.id, zones.cameraId), eq(cameras.userId, session.id)));

  const deleted = await db
    .delete(zones)
    .where(and(eq(zones.id, id), sql`exists ${owned}`))
    .returning({ id: zones.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Bölge bulunamadı." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
