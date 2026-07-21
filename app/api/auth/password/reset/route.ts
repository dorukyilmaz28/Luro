import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyOtp } from "@/lib/auth/otp";
import { hashPassword } from "@/lib/auth/password";

type Body = {
  email?: string;
  code?: string;
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
  const code = String(body.code || "").trim();
  const password = String(body.password || "");

  if (!email || !code) {
    return NextResponse.json({ error: "E-posta ve kod gerekli." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Şifre en az 8 karakter olmalı." }, { status: 400 });
  }

  const result = await verifyOtp(email, "password_reset", code);
  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: "Kod bulunamadı. Lütfen yeni bir kod isteyin.",
      expired: "Kodun süresi doldu. Lütfen yeni bir kod isteyin.",
      too_many_attempts: "Çok fazla deneme yapıldı. Lütfen yeni bir kod isteyin.",
      invalid: "Kod hatalı.",
    };
    return NextResponse.json({ error: messages[result.reason] ?? "Kod doğrulanamadı." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash }).where(eq(users.email, email));

  return NextResponse.json({ ok: true });
}
