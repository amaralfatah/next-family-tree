import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { getMembership, requireRole, assertRole, type TreeAccess } from "@/lib/access";
import type { DB } from "@/lib/db";
import { changeLog, invites, persons, treeMembers, trees, users } from "@/lib/db/schema";
import { UserError } from "@/lib/errors";
import type { Role } from "@/lib/types";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const ROLE_NAME: Record<Role, string> = { owner: "pemilik", editor: "editor", viewer: "pembaca" };

async function log(db: DB, treeId: string, userId: string, action: string, summary: string) {
  await db.insert(changeLog).values({ treeId, userId, entity: "member", action, summary });
}

export async function listMembers(db: DB, userId: string, treeId: string) {
  return listMembersWith(db, await requireRole(db, treeId, userId, "viewer"));
}

export async function listMembersWith(db: DB, { treeId }: TreeAccess) {
  return db
    .select({
      userId: treeMembers.userId,
      role: treeMembers.role,
      personId: treeMembers.personId,
      name: users.name,
      email: users.email,
      image: users.image,
      personName: persons.fullName,
      joinedAt: treeMembers.createdAt,
    })
    .from(treeMembers)
    .innerJoin(users, eq(users.id, treeMembers.userId))
    .leftJoin(persons, eq(persons.id, treeMembers.personId))
    .where(eq(treeMembers.treeId, treeId))
    .orderBy(asc(treeMembers.createdAt));
}

/** Returns the raw token once; only its hash is stored. */
export async function createInvite(db: DB, userId: string, treeId: string, role: Exclude<Role, "owner">, days: number) {
  await requireRole(db, treeId, userId, "owner");
  if (!["editor", "viewer"].includes(role)) throw new UserError("Peran undangan tidak valid.");
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + Math.min(Math.max(days, 1), 90) * 86_400_000);
  const [row] = await db
    .insert(invites)
    .values({ treeId, tokenHash: hashToken(token), role, expiresAt, createdBy: userId })
    .returning({ id: invites.id });
  await log(db, treeId, userId, "invite", `Membuat link undangan sebagai ${ROLE_NAME[role]}`);
  return { id: row.id, token, expiresAt };
}

export async function listInvites(db: DB, userId: string, treeId: string) {
  return listInvitesWith(db, await requireRole(db, treeId, userId, "owner"));
}

export async function listInvitesWith(db: DB, access: TreeAccess) {
  assertRole(access, "owner");
  const { treeId } = access;
  const rows = await db
    .select({ id: invites.id, role: invites.role, expiresAt: invites.expiresAt, revokedAt: invites.revokedAt, createdAt: invites.createdAt })
    .from(invites)
    .where(eq(invites.treeId, treeId))
    .orderBy(desc(invites.createdAt));
  const now = Date.now();
  return rows.map((r) => ({
    ...r,
    state: (r.revokedAt ? "revoked" : r.expiresAt.getTime() < now ? "expired" : "active") as "active" | "expired" | "revoked",
  }));
}

export async function revokeInvite(db: DB, userId: string, treeId: string, inviteId: string) {
  await requireRole(db, treeId, userId, "owner");
  await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(and(eq(invites.id, inviteId), eq(invites.treeId, treeId)));
  await log(db, treeId, userId, "revoke", "Mencabut link undangan");
}

export type InviteState =
  | { status: "invalid" }
  | { status: "expired" | "revoked"; treeName: string }
  | { status: "valid"; treeId: string; treeName: string; role: Role; alreadyMember: boolean };

export async function inspectInvite(db: DB, token: string, userId: string | null): Promise<InviteState> {
  const [row] = await db
    .select({ invite: invites, treeName: trees.name })
    .from(invites)
    .innerJoin(trees, eq(trees.id, invites.treeId))
    .where(eq(invites.tokenHash, hashToken(token)));
  if (!row) return { status: "invalid" };
  if (row.invite.revokedAt) return { status: "revoked", treeName: row.treeName };
  if (row.invite.expiresAt.getTime() < Date.now()) return { status: "expired", treeName: row.treeName };
  const alreadyMember = userId ? Boolean(await getMembership(db, row.invite.treeId, userId)) : false;
  return { status: "valid", treeId: row.invite.treeId, treeName: row.treeName, role: row.invite.role, alreadyMember };
}

/** Joins the tree. An existing member keeps the higher of their current role and the invite's. */
export async function acceptInvite(db: DB, userId: string, token: string): Promise<string> {
  const state = await inspectInvite(db, token, userId);
  if (state.status === "invalid") throw new UserError("Link undangan tidak dikenal.");
  if (state.status !== "valid") throw new UserError("Link undangan sudah tidak berlaku. Minta link baru ke pemilik pohon.");
  const current = await getMembership(db, state.treeId, userId);
  if (!current) {
    await db.insert(treeMembers).values({ treeId: state.treeId, userId, role: state.role });
    await log(db, state.treeId, userId, "join", `Bergabung sebagai ${ROLE_NAME[state.role]}`);
  } else if (current.role === "viewer" && state.role === "editor") {
    await db
      .update(treeMembers)
      .set({ role: "editor" })
      .where(and(eq(treeMembers.treeId, state.treeId), eq(treeMembers.userId, userId)));
  }
  return state.treeId;
}

export async function changeRole(db: DB, userId: string, treeId: string, memberId: string, role: Exclude<Role, "owner">) {
  await requireRole(db, treeId, userId, "owner");
  if (memberId === userId) throw new UserError("Gunakan serah terima kepemilikan untuk mengubah peran Anda sendiri.");
  const target = await getMembership(db, treeId, memberId);
  if (!target) throw new UserError("Anggota tidak ditemukan.");
  await db
    .update(treeMembers)
    .set({ role })
    .where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, memberId)));
  await log(db, treeId, userId, "role", `Mengubah peran anggota menjadi ${ROLE_NAME[role]}`);
}

export async function removeMember(db: DB, userId: string, treeId: string, memberId: string) {
  await requireRole(db, treeId, userId, "owner");
  if (memberId === userId) throw new UserError("Pemilik tidak bisa mengeluarkan dirinya sendiri.");
  await db.delete(treeMembers).where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, memberId)));
  await log(db, treeId, userId, "remove", "Mengeluarkan anggota");
}

export async function leaveTree(db: DB, userId: string, treeId: string) {
  const m = await requireRole(db, treeId, userId, "viewer");
  if (m.role === "owner") {
    throw new UserError("Pemilik harus menyerahkan kepemilikan ke anggota lain atau menghapus pohon sebelum keluar.");
  }
  await db.delete(treeMembers).where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, userId)));
  await log(db, treeId, userId, "leave", "Keluar dari pohon");
}

export async function transferOwnership(db: DB, userId: string, treeId: string, newOwnerId: string) {
  await requireRole(db, treeId, userId, "owner");
  if (newOwnerId === userId) throw new UserError("Pilih anggota lain.");
  const target = await getMembership(db, treeId, newOwnerId);
  if (!target) throw new UserError("Anggota tidak ditemukan.");
  await db.transaction(async (tx) => {
    await tx
      .update(treeMembers)
      .set({ role: "owner" })
      .where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, newOwnerId)));
    await tx
      .update(treeMembers)
      .set({ role: "editor" })
      .where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, userId)));
    await tx.update(trees).set({ ownerId: newOwnerId }).where(eq(trees.id, treeId));
  });
  await log(db, treeId, userId, "transfer", "Menyerahkan kepemilikan pohon");
}

/** Links (or unlinks, with null) the current user's account to a person in the tree. */
export async function linkMe(db: DB, userId: string, treeId: string, personId: string | null) {
  await requireRole(db, treeId, userId, "viewer");
  if (personId) {
    const [p] = await db
      .select({ id: persons.id })
      .from(persons)
      .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)));
    if (!p) throw new UserError("Orang tidak ditemukan di pohon ini.");
    const [taken] = await db
      .select({ userId: treeMembers.userId })
      .from(treeMembers)
      .where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.personId, personId), ne(treeMembers.userId, userId)));
    if (taken) throw new UserError("Orang ini sudah ditautkan ke akun anggota lain.");
  }
  await db
    .update(treeMembers)
    .set({ personId })
    .where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, userId)));
}
