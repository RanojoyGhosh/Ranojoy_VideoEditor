import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: no session cookie → go to /login.
 * The real check (signature + admin email) is requireAdmin() in every page and action.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("cg_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the login page, API routes (they check their own secret) and static files.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
