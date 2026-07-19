import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySession, type SessionPayload } from "./jwt";

export type SessionUser = {
  id: string;
  email: string;
  companyName: string | null;
};

function toUser(session: SessionPayload): SessionUser {
  return { id: session.sub, email: session.email, companyName: session.companyName };
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
