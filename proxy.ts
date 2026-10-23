import { NextResponse, type NextRequest } from "next/server";
import { neonAuth } from "@/lib/auth/neon";

const VERIFIER = "neon_auth_session_verifier";

/**
 * Two jobs, both only for Google (Neon Auth) sessions:
 *
 * 1. Finishes Google sign-in: Neon Auth sends the browser back with `?neon_auth_session_verifier=…`, and its
 *    middleware swaps that for the session cookie, then redirects to the same URL without the parameter.
 * 2. Keeps the signed 5-minute session cache cookie fresh, so pages rarely have to ask Neon Auth over the network.
 *
 * Pages still guard themselves with requireUser(), so this never sends anyone to /masuk on its own: a failed
 * session lookup here (a network blip) just lets the request through, and the development test login keeps working.
 */
export async function proxy(request: NextRequest) {
  const auth = neonAuth();
  if (!auth) return NextResponse.next();
  const response = await auth.middleware({ loginUrl: "/masuk?error=google" })(request);
  if (request.nextUrl.searchParams.has(VERIFIER)) return response;

  const setCookies = response.headers.getSetCookie();
  if (response.status !== 200 || setCookies.length === 0) return NextResponse.next();
  // Hand the refreshed cookies to this same render too, not only to the browser for the next request.
  const cookies = new Map(request.cookies.getAll().map((c) => [c.name, c.value]));
  for (const header of setCookies) {
    const pair = header.split(";", 1)[0];
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const [name, value] = [pair.slice(0, eq), pair.slice(eq + 1)];
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }
  const headers = new Headers(request.headers);
  headers.set("cookie", [...cookies].map(([name, value]) => `${name}=${value}`).join("; "));
  const next = NextResponse.next({ request: { headers } });
  for (const header of setCookies) next.headers.append("Set-Cookie", header);
  return next;
}

export const config = {
  matcher: [
    { source: "/((?!api/auth|_next/static|_next/image|favicon.ico).*)", has: [{ type: "query", key: "neon_auth_session_verifier" }] },
    { source: "/((?!api/auth|_next/static|_next/image|favicon.ico).*)", has: [{ type: "cookie", key: "__Secure-neon-auth.session_token" }] },
  ],
};
