import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyOtp } from "@/lib/auth/otp";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, signSession } from "@/lib/auth/jwt";

type Body = {
  email?: string;
  code?: string;
};

const REASON_MESSAGES: Record<string, string> = {
  not_found: "Kod bulunamadı. Yeni bir kod isteyin.",
  expired: "Kodun süresi doldu. Yeni bir kod isteyin.",
  too_many_attempts: "Çok fazla hatalı deneme. Yeni bir kod isteyin.",
  invalid: "Kod hatalı. Tekrar deneyin.",
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const code = String(body.code || "").trim();

  if (!email || !code) {
    return NextResponse.json({ error: "E-posta ve kod gerekli." }, { status: 400 });
  }

  const result = await verifyOtp(email, "signup", code);
  if (!result.ok) {
    return NextResponse.json({ error: REASON_MESSAGES[result.reason] }, { status: 400 });
  }

  const [user] = await db
    .update(users)
    .set({ emailVerified: true, onboardingStep: "company_info" })
    .where(eq(users.email, email))
    .returning();

  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    companyName: user.companyName,
    onboardingStep: user.onboardingStep,
  });

  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, companyName: user.companyName },
  });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
