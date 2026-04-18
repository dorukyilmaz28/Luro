import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isLoginRoute = pathname === "/login";

  let sessionResult: Awaited<ReturnType<typeof updateSession>> | null = null;

  if (isDashboardRoute || isLoginRoute) {
    sessionResult = await updateSession(request);
  }

  const user = sessionResult?.user ?? null;

  if (isDashboardRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoginRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return sessionResult?.response ?? NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
