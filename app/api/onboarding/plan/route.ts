import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getSession, refreshSessionCookie } from "@/lib/auth/session";

const VALID_PLANS = ["baslangic", "profesyonel", "kurumsal"];

type Body = { plan?: string };

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

  const plan = String(body.plan || "");
  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Geçersiz plan." }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set({ selectedPlan: plan, onboardingStep: "complete" })
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
