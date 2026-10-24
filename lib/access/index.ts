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
 * error as a missing tree so tree ids can't be probed. `message` is a key in the `errors` namespace.
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

declare const checked: unique symbol;

/**
 * Proof that requireRole has already checked this user's membership of `treeId` in this request.
 * Only requireRole creates one, so the `...With(db, access)` readers can skip a second membership
 * query without being callable unchecked. Pass it along instead of caching memberships per request:
 * a cache could hand a render the role from before an action changed it (e.g. a transfer of ownership).
 */
export type TreeAccess = Membership & { readonly treeId: string; readonly [checked]: true };

/** For readers that need more than the role the access was checked for. */
export function assertRole(access: TreeAccess, role: Role) {
  if (!hasRole(access.role, role)) throw forbidden(role);
}

function forbidden(role: Role) {
  return new AccessError(
    role === "owner" ? "ownerOnly" : "readOnly",
    "forbidden",
  );
}

export async function getMembership(db: DB, treeId: string, userId: string): Promise<Membership | null> {
  const [row] = await db
    .select({ role: treeMembers.role, personId: treeMembers.personId })
    .from(treeMembers)
    .where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function requireRole(db: DB, treeId: string, userId: string, role: Role): Promise<TreeAccess> {
  if (!isUuid(treeId)) throw new AccessError("treeNotFound", "not_found");
  const membership = await getMembership(db, treeId, userId);
  if (!membership) throw new AccessError("treeNotFound", "not_found");
  if (!hasRole(membership.role, role)) throw forbidden(role);
  return { ...membership, treeId } as TreeAccess;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
