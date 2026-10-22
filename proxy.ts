import { NextResponse, type NextRequest } from "next/server";
import { neonAuth } from "@/lib/auth/neon";

/**
 * Finishes Google sign-in: Neon Auth sends the browser back with `?neon_auth_session_verifier=…`, and its
 * middleware swaps that for the session cookie, then redirects to the same URL without the parameter.
 * Only those returns run through here; pages still guard themselves with requireUser(), so the
 * development test login keeps working.
 */
export async function proxy(request: NextRequest) {
  const auth = neonAuth();
  if (!auth) return NextResponse.next();
  return auth.middleware({ loginUrl: "/masuk?error=google" })(request);
}

export const config = {
  matcher: [{ source: "/((?!api/auth|_next/static|_next/image|favicon.ico).*)", has: [{ type: "query", key: "neon_auth_session_verifier" }] }],
};
