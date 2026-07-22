import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, snapshots } from "@/lib/db/schema";
import { getSessionFromRequest } from "@/lib/auth/session";

// Serves a camera's current live frame (the connector refreshes it every few
// seconds). The dashboard reloads this URL to show a near-live view.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const { id } = await params;

  const [camera] = await db
    .select({ liveSnapshotId: cameras.liveSnapshotId })
    .from(cameras)
    .where(and(eq(cameras.id, id), eq(cameras.userId, session.id)))
    .limit(1);

  if (!camera?.liveSnapshotId) {
    return NextResponse.json({ error: "Canlı görüntü yok." }, { status: 404 });
  }

  const [snapshot] = await db
    .select({ data: snapshots.data })
    .from(snapshots)
    .where(eq(snapshots.id, camera.liveSnapshotId))
    .limit(1);

  if (!snapshot) {
    return NextResponse.json({ error: "Canlı görüntü yok." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(snapshot.data, "base64"), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
  });
}
