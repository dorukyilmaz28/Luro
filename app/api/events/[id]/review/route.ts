import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, events } from "@/lib/db/schema";
import { getSessionFromRequest } from "@/lib/auth/session";

const VALID_STATUSES = ["pending", "confirmed_violation", "dismissed"] as const;

type Body = {
  reviewStatus?: string;
  reviewNote?: string;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const { id } = await params;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const updates: { reviewStatus?: string; reviewNote?: string } = {};
  if (body.reviewStatus !== undefined) {
    if (!VALID_STATUSES.includes(body.reviewStatus as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });
    }
    updates.reviewStatus = body.reviewStatus;
  }
  if (body.reviewNote !== undefined) {
    updates.reviewNote = String(body.reviewNote).slice(0, 1000);
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 });
  }

  // Scope to the session user: only update an event whose camera belongs to them.
  const owned = db
    .select({ id: cameras.id })
    .from(cameras)
    .where(and(eq(cameras.id, events.cameraId), eq(cameras.userId, session.id)));

  const updated = await db
    .update(events)
    .set(updates)
    .where(and(eq(events.id, id), sql`exists ${owned}`))
    .returning({ id: events.id });

  if (updated.length === 0) {
    return NextResponse.json({ error: "Olay bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
