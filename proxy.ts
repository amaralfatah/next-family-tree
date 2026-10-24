import { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { neonAuth } from "@/lib/auth/neon";
import { routing } from "@/i18n/routing";

const VERIFIER = "neon_auth_session_verifier";
const SESSION_COOKIE = "__Secure-neon-auth.session_token";
const intl = createIntlMiddleware(routing);

/**
 * Three jobs:
 *
 * 1. Finishes Google sign-in: Neon Auth sends the browser back with `?neon_auth_session_verifier=…`, and its
 *    middleware swaps that for the session cookie, then redirects to the same URL without the parameter.
 * 2. Keeps the signed 5-minute session cache cookie fresh, so pages rarely have to ask Neon Auth over the network.
 * 3. Locale routing: a path without /id or /en is redirected to one (NEXT_LOCALE cookie, then Accept-Language).
 *
 * Pages still guard themselves with requireUser(), so this never sends anyone to /login on its own: a failed
 * session lookup here (a network blip) just lets the request through.
 */
export async function proxy(request: NextRequest) {
  const auth = neonAuth();
  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!auth || (!hasSession && !request.nextUrl.searchParams.has(VERIFIER))) return intl(request);

  const response = await auth.middleware({ loginUrl: "/login?error=google" })(request);
  if (request.nextUrl.searchParams.has(VERIFIER)) return response;

  const setCookies = response.headers.getSetCookie();
  if (response.status !== 200 || setCookies.length === 0) return intl(request);
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
  const next = intl(new NextRequest(request, { headers }));
  for (const header of setCookies) next.headers.append("Set-Cookie", header);
  return next;
}

export const config = {
  // Everything except the API (including /api/auth), Next internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
