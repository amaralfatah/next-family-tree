import { decodeIdToken } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { googleClient } from "@/lib/auth/google";
import { createSession, findOrCreateUser, googleEnabled, safeNext } from "@/lib/auth/session";

interface GoogleClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const fail = () => NextResponse.redirect(new URL("/masuk?error=google", request.url));
  if (!googleEnabled()) return fail();

  const jar = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const expected = jar.get("g_state")?.value;
  const verifier = jar.get("g_verifier")?.value;
  const next = safeNext(jar.get("g_next")?.value);
  jar.delete("g_state");
  jar.delete("g_verifier");
  jar.delete("g_next");
  if (!state || !code || !expected || !verifier || state !== expected) return fail();

  try {
    const tokens = await googleClient(request.nextUrl.origin).validateAuthorizationCode(code, verifier);
    const claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
    if (!claims.email || claims.email_verified === false) return fail();
    const userId = await findOrCreateUser({
      email: claims.email,
      name: claims.name ?? claims.email.split("@")[0],
      image: claims.picture ?? null,
      googleSub: claims.sub,
    });
    await createSession(userId);
    return NextResponse.redirect(new URL(next, request.url));
  } catch {
    return fail();
  }
}
