import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { snapshots } from "@/lib/db/schema";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const { id } = await params;

  const [snapshot] = await db
    .select({ data: snapshots.data })
    .from(snapshots)
    .where(and(eq(snapshots.id, id), eq(snapshots.userId, session.id)))
    .limit(1);

  if (!snapshot) {
    return NextResponse.json({ error: "Görüntü bulunamadı." }, { status: 404 });
  }

  const bytes = Buffer.from(snapshot.data, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
