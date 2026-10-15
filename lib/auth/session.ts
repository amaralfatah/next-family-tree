import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

export const SESSION_COOKIE = "wargi_session";
const DAY = 86_400_000;
const SESSION_DAYS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  const db = await getDb();
  await db.insert(sessions).values({ id: hash(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** The signed-in user, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, hash(token)));
  if (!row) return null;
  if (row.session.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.session.id));
    return null;
  }
  const { id, name, email, image } = row.user;
  return { id, name, email, image };
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/masuk?next=${encodeURIComponent(next)}` : "/masuk");
  return user;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, hash(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Upserts by Google subject first, then by email (so a dev-login account can later link Google). */
export async function findOrCreateUser(input: { email: string; name: string; image?: string | null; googleSub?: string }) {
  const db = await getDb();
  const email = input.email.trim().toLowerCase();
  if (input.googleSub) {
    const [bySub] = await db.select().from(users).where(eq(users.googleSub, input.googleSub));
    if (bySub) return bySub.id;
  }
  const [byEmail] = await db.select().from(users).where(eq(users.email, email));
  if (byEmail) {
    if (input.googleSub && !byEmail.googleSub) {
      await db.update(users).set({ googleSub: input.googleSub, image: input.image ?? byEmail.image }).where(eq(users.id, byEmail.id));
    }
    return byEmail.id;
  }
  const [created] = await db
    .insert(users)
    .values({ email, name: input.name, image: input.image ?? null, googleSub: input.googleSub ?? null })
    .returning({ id: users.id });
  return created.id;
}

export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/pohon";
  return next;
}

export const devLoginEnabled = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_LOGIN === "1";
export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
