import { jwtVerify, SignJWT } from "jose";

const SESSION_COOKIE_NAME = "luro_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type OnboardingStep = "email_verify" | "company_info" | "recommendation" | "plan" | "complete";

export type SessionPayload = {
  sub: string;
  email: string;
  companyName: string | null;
  onboardingStep: OnboardingStep;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is missing.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, companyName: payload.companyName, onboardingStep: payload.onboardingStep })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

const VALID_STEPS: OnboardingStep[] = ["email_verify", "company_info", "recommendation", "plan", "complete"];

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    const step = VALID_STEPS.includes(payload.onboardingStep as OnboardingStep)
      ? (payload.onboardingStep as OnboardingStep)
      : "complete";
    return {
      sub: payload.sub,
      email: payload.email,
      companyName: typeof payload.companyName === "string" ? payload.companyName : null,
      onboardingStep: step,
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS };
