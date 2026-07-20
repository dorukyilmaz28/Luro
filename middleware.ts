import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySession, type OnboardingStep } from "@/lib/auth/jwt";

const STEP_PATH: Record<OnboardingStep, string> = {
  email_verify: "/signup/verify",
  company_info: "/onboarding/company",
  recommendation: "/onboarding/recommendation",
  plan: "/onboarding/plan",
  complete: "/dashboard",
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/signup/verify";

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if ((isDashboard || isOnboarding) && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session) {
    const target = STEP_PATH[session.onboardingStep];

    if (isAuthPage) {
      return NextResponse.redirect(new URL(target, request.url));
    }

    if (session.onboardingStep !== "complete" && isDashboard) {
      return NextResponse.redirect(new URL(target, request.url));
    }

    if (session.onboardingStep === "complete" && isOnboarding) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/login", "/signup", "/signup/verify"],
};
