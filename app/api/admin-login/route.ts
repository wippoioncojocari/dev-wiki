import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  clearAttempts,
  createAdminSession,
  getAdminConfig,
  isRateLimited,
  recordFailedAttempt,
  sanitizeNextPath,
} from "@/app/lib/admin-auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const requestedNext =
    (formData?.get("next") as string | null) ??
    new URL(request.url).searchParams.get("next");
  const nextPath = sanitizeNextPath(requestedNext);

  const redirectToLogin = (reason: string) => {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", nextPath);
    loginUrl.searchParams.set("error", reason);
    return NextResponse.redirect(loginUrl);
  };

  const config = getAdminConfig();
  if (!config) {
    return redirectToLogin("setup");
  }

  const password = (formData?.get("password") ?? "").toString();
  const fingerprint = getFingerprint(request);

  if (isRateLimited(fingerprint, config.rateLimit)) {
    return redirectToLogin("rate");
  }

  if (password !== config.password) {
    recordFailedAttempt(fingerprint);
    return redirectToLogin("invalid");
  }

  clearAttempts(fingerprint);
  const session = await createAdminSession(config.cookieSecret, config.sessionTtlMinutes);
  const response = NextResponse.redirect(new URL(nextPath, request.url));
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: session,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: config.sessionTtlMinutes * 60,
  });
  return response;
}

const getFingerprint = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.ip ?? "unknown";
};
