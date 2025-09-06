import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const payload = token ? verifyToken(token) : null;
  const { pathname } = request.nextUrl;

  // List of protected routes that require a valid token
  const protectedRoutes = ["/dashboard", "/projects", "/api/protected"];

  // List of public routes that a logged-in user should be redirected from
  const authRoutes = ["/login", "/register"];

  // 1. If a user with a valid token tries to access an auth page, redirect them to the dashboard.
  if (payload && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. If a user tries to access a protected route without a valid token, redirect them to the login page.
  if (!payload && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // For all other cases, continue to the requested page.
  return NextResponse.next();
}

export const config = {
  // Use a more inclusive matcher to catch all relevant routes
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/api/protected/:path*",
    "/login",
    "/register",
  ],
};
