import { NextResponse, type NextRequest } from "next/server";

/**
 * Only forwards the requested path to server components (used for "?next=" after login).
 * Authentication and authorization are NOT done here – every page, action and domain
 * function checks them on the server itself.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|api/|icons/|sw\\.js|manifest\\.webmanifest|favicon).*)"],
};
