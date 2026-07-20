import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { canResendOtp, issueOtp, RESEND_COOLDOWN_SECONDS } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/email/sendOtpEmail";
import { getLocale } from "@/lib/i18n/server";

type Body = {
  email?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "E-posta gerekli." }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Avoid leaking whether an email is registered: silently succeed if there's
  // nothing to resend a code for.
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  const canResend = await canResendOtp(email, "signup");
  if (!canResend) {
    return NextResponse.json(
      { error: `Lütfen ${RESEND_COOLDOWN_SECONDS} saniye bekleyip tekrar deneyin.` },
      { status: 429 },
    );
  }

  const locale = await getLocale();
  const code = await issueOtp(email, "signup");
  try {
    await sendOtpEmail(email, code, locale);
  } catch (err) {
    console.error("sendOtpEmail failed:", err);
    return NextResponse.json(
      { error: "Doğrulama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin veya bizimle iletişime geçin." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
