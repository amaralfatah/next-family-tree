"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, devLoginEnabled, findOrCreateUser, requireUser, safeNext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { composeDate } from "@/lib/dates";
import { UserError } from "@/lib/errors";
import * as members from "@/lib/members/service";
import { deletePhotos } from "@/lib/storage";
import * as tree from "@/lib/tree/service";
import type { ChildRelation, Role, UnionStatus } from "@/lib/types";
import { formValue as get, parsePerson, run, type ActionResult } from "./shared";

const treePath = (treeId: string) => `/pohon/${treeId}`;
/** Only the tree's own chart is a valid place to return to after adding someone. */
const chartReturn = (treeId: string, v: string | undefined) => (v && (v === treePath(treeId) || v.startsWith(`${treePath(treeId)}?`)) ? v : null);
const refreshTree = (treeId: string) => revalidatePath(treePath(treeId), "layout");

// ---------------------------------------------------------------- auth

export async function devLogin(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  if (!devLoginEnabled()) return { ok: false, error: "Login uji coba tidak aktif." };
  const parsed = z
    .object({ name: z.string().trim().min(1, "Isi nama."), email: z.email("Email tidak valid.") })
    .safeParse({ name: get(fd, "name"), email: get(fd, "email").trim() });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const userId = await findOrCreateUser(parsed.data);
  await createSession(userId);
  redirect(safeNext(get(fd, "next")));
}

/**
 * No redirect here: rendering the next page in this same request would still read the old Neon Auth
 * cookies from the request headers and bounce back to /pohon. The client does a full page load instead.
 */
export async function logout() {
  await destroySession();
}

// ---------------------------------------------------------------- trees

export async function createTreeAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const name = get(fd, "treeName").trim();
  if (!name) return { ok: false, error: "Nama pohon wajib diisi." };
  if (name.length > 120) return { ok: false, error: "Nama pohon terlalu panjang." };
  const result = await run((db, userId) =>
    tree.createTree(db, userId, {
      name,
      description: get(fd, "treeDescription").trim() || null,
      firstPerson: parsePerson(fd),
      isMe: get(fd, "isMe") === "on",
    }),
  );
  if (!result.ok) return result;
  redirect(treePath(result.data));
}

export async function updateTreeAction(treeId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const name = get(fd, "treeName").trim();
  if (!name) return { ok: false, error: "Nama pohon wajib diisi." };
  const r = await run((db, u) => tree.updateTree(db, u, treeId, { name: name.slice(0, 120), description: get(fd, "treeDescription").trim() || null }));
  if (r.ok) refreshTree(treeId);
  return r;
}

export async function setRootAction(treeId: string, personId: string) {
  const r = await run((db, u) => tree.setRootPerson(db, u, treeId, personId));
  if (r.ok) refreshTree(treeId);
  return r;
}

export async function deleteTreeAction(treeId: string, confirmName: string): Promise<ActionResult> {
  const user = await requireUser();
  const db = await getDb();
  const r = await run(async () => {
    const { tree: t } = await tree.getTree(db, user.id, treeId);
    if (confirmName.trim() !== t.name) throw new UserError("Nama pohon yang diketik tidak cocok.");
    const photos = await tree.deleteTree(db, user.id, treeId);
    after(() => deletePhotos(photos));
  });
  if (!r.ok) return r;
  revalidatePath("/pohon");
  redirect("/pohon");
}

// ---------------------------------------------------------------- persons

const relationSchema = z.object({
  kind: z.enum(["parent", "partner", "child", "sibling"]),
  ofId: z.uuid(),
  unionId: z.uuid().nullable(),
  childRelation: z.enum(["biological", "adopted", "step"]),
  unionStatus: z.enum(["married", "divorced", "widowed", "unknown"]),
});

function parseRelation(fd: FormData): tree.RelationSpec | undefined {
  if (!get(fd, "relKind")) return undefined;
  return relationSchema.parse({
    kind: get(fd, "relKind"),
    ofId: get(fd, "relOf"),
    unionId: get(fd, "relUnion") || null,
    childRelation: get(fd, "childRelation") || "biological",
    unionStatus: get(fd, "unionStatus") || "married",
  });
}

export async function createPersonAction(treeId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const r = await run(async (db, u) => {
    const relation = parseRelation(fd);
    const existing = get(fd, "existingId");
    if (relation && existing) {
      const otherId = z.uuid().parse(existing);
      await tree.linkExisting(db, u, treeId, relation, otherId);
      return { profile: relation.ofId, added: otherId };
    }
    const id = await tree.createPerson(db, u, treeId, parsePerson(fd), relation);
    return { profile: id, added: id };
  });
  if (!r.ok) return r;
  refreshTree(treeId);
  // Back on the chart, `ditambah` lets it select the person and re-centre if the view can't show them yet.
  const chart = chartReturn(treeId, get(fd, "kembali"));
  if (!chart) redirect(`${treePath(treeId)}/orang/${r.data.profile}`);
  const [path, query] = chart.split("?");
  const sp = new URLSearchParams(query);
  sp.set("ditambah", r.data.added);
  redirect(`${path}?${sp}`);
}

export async function updatePersonAction(
  treeId: string,
  personId: string,
  _: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  const r = await run((db, u) =>
    tree.updatePerson(db, u, treeId, personId, parsePerson(fd), {
      expectedUpdatedAt: get(fd, "updatedAt") || undefined,
      force: get(fd, "force") === "1",
    }),
  );
  if (!r.ok) return r;
  if (r.data.conflict) {
    return {
      ok: false,
      conflict: true,
      error: "Data orang ini sudah diubah anggota lain sejak Anda membukanya. Simpan lagi untuk menimpa, atau muat ulang untuk melihat perubahan.",
    };
  }
  refreshTree(treeId);
  redirect(`${treePath(treeId)}/orang/${personId}`);
}

export async function deletePersonAction(treeId: string, personId: string): Promise<ActionResult> {
  const r = await run(async (db, u) => {
    const photo = await tree.deletePerson(db, u, treeId, personId);
    if (photo) after(() => deletePhotos([photo]));
  });
  if (!r.ok) return r;
  refreshTree(treeId);
  redirect(`${treePath(treeId)}/daftar`);
}

// ---------------------------------------------------------------- unions & child links

export async function updateUnionAction(
  treeId: string,
  unionId: string,
  input: { status: UnionStatus; startYear: string; startMonth: string; startDay: string; orderIndex: number },
) {
  const start = composeDate(input.startYear, input.startMonth, input.startDay);
  const r = await run((db, u) =>
    tree.updateUnion(db, u, treeId, unionId, {
      status: z.enum(["married", "divorced", "widowed", "unknown"]).parse(input.status),
      startDate: start.date,
      orderIndex: Math.max(0, Math.min(50, Math.trunc(input.orderIndex) || 0)),
    }),
  );
  if (r.ok) refreshTree(treeId);
  return r;
}

export async function deleteUnionAction(treeId: string, unionId: string) {
  const r = await run((db, u) => tree.deleteUnion(db, u, treeId, unionId));
  if (r.ok) refreshTree(treeId);
  return r;
}

export async function updateChildLinkAction(treeId: string, unionId: string, childId: string, relation: ChildRelation, birthOrder: number | null) {
  const r = await run((db, u) =>
    tree.updateChildLink(db, u, treeId, unionId, childId, {
      relation: z.enum(["biological", "adopted", "step"]).parse(relation),
      birthOrder: birthOrder && birthOrder > 0 ? Math.trunc(birthOrder) : null,
    }),
  );
  if (r.ok) refreshTree(treeId);
  return r;
}

export async function removeChildLinkAction(treeId: string, unionId: string, childId: string) {
  const r = await run((db, u) => tree.removeChildLink(db, u, treeId, unionId, childId));
  if (r.ok) refreshTree(treeId);
  return r;
}

// ---------------------------------------------------------------- members

export async function createInviteAction(treeId: string, role: Exclude<Role, "owner">, days: number) {
  const r = await run((db, u) => members.createInvite(db, u, treeId, role, days));
  if (r.ok) refreshTree(treeId);
  return r.ok ? { ok: true as const, data: { token: r.data.token, expiresAt: r.data.expiresAt.toISOString() } } : r;
}

export async function revokeInviteAction(treeId: string, inviteId: string) {
  const r = await run((db, u) => members.revokeInvite(db, u, treeId, inviteId));
  if (r.ok) refreshTree(treeId);
  return r;
}

export async function acceptInviteAction(token: string) {
  const r = await run((db, u) => members.acceptInvite(db, u, token));
  if (!r.ok) return r;
  revalidatePath("/pohon");
  redirect(`${treePath(r.data)}?baru=1`);
}

export async function changeRoleAction(treeId: string, memberId: string, role: Exclude<Role, "owner">) {
  const r = await run((db, u) => members.changeRole(db, u, treeId, memberId, role));
  if (r.ok) refreshTree(treeId);
  return r;
}

export async function removeMemberAction(treeId: string, memberId: string) {
  const r = await run((db, u) => members.removeMember(db, u, treeId, memberId));
  if (r.ok) refreshTree(treeId);
  return r;
}

export async function transferOwnershipAction(treeId: string, memberId: string) {
  const r = await run((db, u) => members.transferOwnership(db, u, treeId, memberId));
  if (r.ok) refreshTree(treeId);
  return r;
}

export async function leaveTreeAction(treeId: string): Promise<ActionResult> {
  const r = await run((db, u) => members.leaveTree(db, u, treeId));
  if (!r.ok) return r;
  revalidatePath("/pohon");
  redirect("/pohon");
}

export async function linkMeAction(treeId: string, personId: string | null) {
  const r = await run((db, u) => members.linkMe(db, u, treeId, personId));
  if (r.ok) refreshTree(treeId);
  return r;
}
