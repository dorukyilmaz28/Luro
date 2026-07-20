import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { issueOtp } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/email/sendOtpEmail";
import { getLocale } from "@/lib/i18n/server";

type Body = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta girin." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Şifre en az 8 karakter olmalı." }, { status: 400 });
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing?.emailVerified) {
    return NextResponse.json({ error: "Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  if (existing) {
    // Unverified signup left over from an earlier attempt: update the password and resend.
    await db.update(users).set({ passwordHash }).where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      email,
      passwordHash,
      emailVerified: false,
      onboardingStep: "email_verify",
    });
  }

  const locale = await getLocale();
  const code = await issueOtp(email, "signup");
  await sendOtpEmail(email, code, locale);

  return NextResponse.json({ ok: true });
}
