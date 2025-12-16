import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminConfig,
  sanitizeNextPath,
  verifyAdminSession,
} from "./app/lib/admin-auth";

const LOGIN_ROUTE = "/admin/login";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAdminArea = path.startsWith("/admin");
  const isAdminApi = path.startsWith("/api/sections");
  const isLoginPath = path.startsWith(LOGIN_ROUTE);

  if (!isAdminArea && !isAdminApi) {
    return NextResponse.next();
  }

  if (isLoginPath) {
    return NextResponse.next();
  }

  const config = getAdminConfig();
  if (!config) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Admin auth not configured." }, { status: 500 });
    }
    const setupUrl = request.nextUrl.clone();
    setupUrl.pathname = LOGIN_ROUTE;
    setupUrl.searchParams.set("error", "setup");
    setupUrl.searchParams.set("next", sanitizeNextPath(path));
    return NextResponse.redirect(setupUrl);
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (token && (await verifyAdminSession(token, config.cookieSecret))) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = LOGIN_ROUTE;
  loginUrl.searchParams.set("next", sanitizeNextPath(path));
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/sections/:path*"],
};
