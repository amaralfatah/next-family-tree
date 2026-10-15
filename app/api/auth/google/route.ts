import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { googleClient } from "@/lib/auth/google";
import { googleEnabled, safeNext } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/masuk?error=google", request.url));
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = googleClient(request.nextUrl.origin).createAuthorizationURL(state, verifier, ["openid", "profile", "email"]);
  url.searchParams.set("prompt", "select_account");

  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 } as const;
  jar.set("g_state", state, opts);
  jar.set("g_verifier", verifier, opts);
  jar.set("g_next", safeNext(request.nextUrl.searchParams.get("next")), opts);
  return NextResponse.redirect(url);
}
