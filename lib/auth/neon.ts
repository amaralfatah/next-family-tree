import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;

/** Set by Neon Auth once Google sign-in finishes. Without it there is no Google session to look up. */
export const NEON_AUTH_SESSION_COOKIE = "__Secure-neon-auth.session_token";

/** Google sign-in runs on Neon Auth (Managed Better Auth); set by `neon deploy` / `neon env pull`. */
export const neonAuthEnabled = () => Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);

let instance: NeonAuth | undefined;

/** The Neon Auth server instance, or null when it isn't configured (local dev with only the test login). */
export function neonAuth(): NeonAuth | null {
  if (!neonAuthEnabled()) return null;
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
  return instance;
}
