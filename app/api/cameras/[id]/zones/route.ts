import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, zones } from "@/lib/db/schema";
import { getSessionFromRequest } from "@/lib/auth/session";

async function ownedCamera(userId: string, cameraId: string) {
  const [row] = await db
    .select({ id: cameras.id })
    .from(cameras)
    .where(and(eq(cameras.id, cameraId), eq(cameras.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

  const { id } = await params;
  if (!(await ownedCamera(session.id, id))) {
    return NextResponse.json({ error: "Kamera bulunamadı." }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(zones)
    .where(eq(zones.cameraId, id))
    .orderBy(desc(zones.createdAt));
  return NextResponse.json({ zones: rows });
}

type PostBody = {
  name?: string;
  type?: string;
  polygon?: [number, number][];
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

  const { id } = await params;
  if (!(await ownedCamera(session.id, id))) {
    return NextResponse.json({ error: "Kamera bulunamadı." }, { status: 404 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const polygon = body.polygon;
  if (!name) {
    return NextResponse.json({ error: "Bölge adı gerekli." }, { status: 400 });
  }
  if (
    !Array.isArray(polygon) ||
    polygon.length < 3 ||
    !polygon.every(
      (p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && n >= 0 && n <= 1),
    )
  ) {
    return NextResponse.json({ error: "Geçersiz bölge (en az 3 nokta, 0–1 aralığında)." }, { status: 400 });
  }

  const [created] = await db
    .insert(zones)
    .values({ cameraId: id, name, type: body.type === "restricted" ? "restricted" : "restricted", polygon })
    .returning();
  return NextResponse.json({ zone: created });
}
