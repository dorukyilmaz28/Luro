import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getSession, refreshSessionCookie } from "@/lib/auth/session";

type Body = {
  companyName?: string;
  industry?: string;
  companySize?: string;
  phone?: string;
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const companyName = String(body.companyName || "").trim();
  const industry = String(body.industry || "").trim();
  const companySize = String(body.companySize || "").trim();
  const phone = String(body.phone || "").trim();

  if (!companyName || !industry || !companySize) {
    return NextResponse.json({ error: "Şirket adı, sektör ve büyüklük gerekli." }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set({ companyName, industry, companySize, phone: phone || null, onboardingStep: "recommendation" })
    .where(eq(users.id, session.id))
    .returning();

  const response = NextResponse.json({ ok: true });
  await refreshSessionCookie(response, {
    id: updated.id,
    email: updated.email,
    companyName: updated.companyName,
    onboardingStep: updated.onboardingStep,
  });
  return response;
}
