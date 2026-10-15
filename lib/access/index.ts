import { and, eq } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { treeMembers } from "@/lib/db/schema";
import type { Role } from "@/lib/types";

const RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };

export function hasRole(actual: Role, required: Role): boolean {
  return RANK[actual] >= RANK[required];
}

/**
 * Thrown when a user may not touch a tree. Non-members get the same "not found"
 * message as a missing tree so tree ids can't be probed.
 */
export class AccessError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "forbidden",
  ) {
    super(message);
    this.name = "AccessError";
  }
}

export interface Membership {
  role: Role;
  personId: string | null;
}

export async function getMembership(db: DB, treeId: string, userId: string): Promise<Membership | null> {
  const [row] = await db
    .select({ role: treeMembers.role, personId: treeMembers.personId })
    .from(treeMembers)
    .where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function requireRole(db: DB, treeId: string, userId: string, role: Role): Promise<Membership> {
  if (!isUuid(treeId)) throw new AccessError("Pohon tidak ditemukan.", "not_found");
  const membership = await getMembership(db, treeId, userId);
  if (!membership) throw new AccessError("Pohon tidak ditemukan.", "not_found");
  if (!hasRole(membership.role, role)) {
    throw new AccessError(
      role === "owner" ? "Hanya pemilik pohon yang bisa melakukan ini." : "Anda hanya punya akses membaca di pohon ini.",
      "forbidden",
    );
  }
  return membership;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
