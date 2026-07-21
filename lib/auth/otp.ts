import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { otpCodes } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "./password";

export const OTP_TTL_MINUTES = 10;
export const MAX_OTP_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

export type OtpPurpose = "signup" | "password_reset";

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Creates and stores a new OTP for the given email/purpose. Returns the plain code to email. */
export async function issueOtp(email: string, purpose: OtpPurpose = "signup"): Promise<string> {
  const code = generateOtpCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await db.insert(otpCodes).values({
    email: email.toLowerCase(),
    codeHash,
    purpose,
    expiresAt,
  });

  return code;
}

async function latestUnconsumedOtp(email: string, purpose: OtpPurpose) {
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.email, email.toLowerCase()), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  return row ?? null;
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "invalid" };

export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<OtpVerifyResult> {
  const row = await latestUnconsumedOtp(email, purpose);
  if (!row) return { ok: false, reason: "not_found" };

  if (row.attempts >= MAX_OTP_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  const matches = await verifyPassword(code, row.codeHash);
  if (!matches) {
    await db
      .update(otpCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(otpCodes.id, row.id));
    return { ok: false, reason: "invalid" };
  }

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id));
  return { ok: true };
}

/** True if enough time has passed since the last issued code that a new one can be sent. */
export async function canResendOtp(email: string, purpose: OtpPurpose = "signup"): Promise<boolean> {
  const row = await latestUnconsumedOtp(email, purpose);
  if (!row) return true;
  const elapsedSeconds = (Date.now() - row.createdAt.getTime()) / 1000;
  return elapsedSeconds >= RESEND_COOLDOWN_SECONDS;
}
