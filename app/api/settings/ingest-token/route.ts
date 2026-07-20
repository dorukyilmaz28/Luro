import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const token = `luro_ing_${randomBytes(24).toString("base64url")}`;
  await db.update(users).set({ ingestToken: token }).where(eq(users.id, session.id));

  return NextResponse.json({ token });
}
