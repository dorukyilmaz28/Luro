import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, users } from "@/lib/db/schema";

// Connector-facing: lists the ingest-token holder's registered cameras so the
// desktop app can show them in a dropdown (no manual code matching).
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

  const rows = await db
    .select({ code: cameras.code, name: cameras.name, detectionEnabled: cameras.detectionEnabled })
    .from(cameras)
    .where(eq(cameras.userId, user.id))
    .orderBy(desc(cameras.createdAt));

  return NextResponse.json({ cameras: rows });
}
