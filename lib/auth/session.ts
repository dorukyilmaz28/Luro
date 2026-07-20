import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  type OnboardingStep,
  type SessionPayload,
} from "./jwt";

export type SessionUser = {
  id: string;
  email: string;
  companyName: string | null;
  onboardingStep: OnboardingStep;
};

function toUser(session: SessionPayload): SessionUser {
  return { id: session.sub, email: session.email, companyName: session.companyName, onboardingStep: session.onboardingStep };
}

/** Server components / server actions: reads the session cookie. */
export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  return session ? toUser(session) : null;
}

/** Route handlers: reads the session cookie or an `Authorization: Bearer` header (mobile). */
export async function getSessionFromRequest(request: Request): Promise<SessionUser | null> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;

  let token = bearerToken;
  if (!token) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    token = match ? decodeURIComponent(match[1]) : null;
  }

  if (!token) return null;
  const session = await verifySession(token);
  return session ? toUser(session) : null;
}

/** Re-signs the session cookie after an onboarding-step transition. */
export async function refreshSessionCookie(response: NextResponse, user: SessionUser): Promise<void> {
  const token = await signSession({
    sub: user.id,
    email: user.email,
    companyName: user.companyName,
    onboardingStep: user.onboardingStep,
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}
