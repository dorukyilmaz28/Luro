import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras } from "@/lib/db/schema";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const { id } = await params;

  const deleted = await db
    .delete(cameras)
    .where(and(eq(cameras.id, id), eq(cameras.userId, session.id)))
    .returning({ id: cameras.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Kamera bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
