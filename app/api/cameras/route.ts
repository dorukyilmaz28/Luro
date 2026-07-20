import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { cameras } from "@/lib/db/schema";
import { getSessionFromRequest } from "@/lib/auth/session";
import { listCameras } from "@/lib/dashboard/risk";

type Body = {
  name?: string;
  code?: string;
  location?: string;
  rtspUrl?: string;
};

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }
  const rows = await listCameras(session.id);
  return NextResponse.json({ cameras: rows });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const code = String(body.code || "").trim();
  const location = String(body.location || "").trim();
  const rtspUrl = String(body.rtspUrl || "").trim();

  if (!name || !code) {
    return NextResponse.json({ error: "Kamera adı ve kodu gerekli." }, { status: 400 });
  }

  try {
    const [created] = await db
      .insert(cameras)
      .values({
        userId: session.id,
        name,
        code,
        location: location || null,
        rtspUrl: rtspUrl || null,
      })
      .returning();
    return NextResponse.json({ camera: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "Bu kamera kodu zaten kullanılıyor." }, { status: 409 });
    }
    return NextResponse.json({ error: "Kamera kaydedilemedi." }, { status: 500 });
  }
}
