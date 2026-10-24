"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { destroySession, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { redirectTo } from "@/i18n/server";
import { UserError } from "@/lib/errors";
import { checkedDate } from "@/lib/person-form";
import * as members from "@/lib/members/service";
import { deletePhotos } from "@/lib/storage";
import * as tree from "@/lib/tree/service";
import type { ChildRelation, Role, UnionStatus } from "@/lib/types";
import { formValue as get, parseBirthOrders, parsePerson, parseRelation, run, type ActionResult } from "./shared";

const treePath = (treeId: string) => `/trees/${treeId}`;
/** Only the tree's own chart is a valid place to return to after adding someone. */
const chartReturn = (treeId: string, v: string | undefined) => (v && (v === treePath(treeId) || v.startsWith(`${treePath(treeId)}?`)) ? v : null);
/** The tree exists under every locale prefix, so each one is refreshed. */
const refreshTree = (treeId: string) => {
  for (const locale of routing.locales) revalidatePath(`/${locale}/trees/${treeId}`, "layout");
};

// ---------------------------------------------------------------- auth

/**
 * No redirect here: rendering the next page in this same request would still read the old Neon Auth
 * cookies from the request headers and bounce back to /trees. The client does a full page load instead.
 */
export async function logout() {
  await destroySession();
}

// ---------------------------------------------------------------- trees

export async function createTreeAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const name = get(fd, "treeName").trim();
  if (!name) return { ok: false, error: (await getTranslations("errors"))("treeNameRequired") };
  if (name.length > 120) return { ok: false, error: (await getTranslations("errors"))("treeNameTooLong") };
  const result = await run((db, userId) =>
    tree.createTree(db, userId, {
      name,
      description: get(fd, "treeDescription").trim() || null,
      firstPerson: parsePerson(fd),
      isMe: get(fd, "isMe") === "on",
    }),
  );
  if (!result.ok) return result;
  return redirectTo(treePath(result.data));
}

export async function updateTreeAction(treeId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const name = get(fd, "treeName").trim();
  if (!name) return { ok: false, error: (await getTranslations("errors"))("treeNameRequired") };
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
    if (confirmName.trim() !== t.name) throw new UserError("treeNameMismatch");
    const photos = await tree.deleteTree(db, user.id, treeId);
    after(() => deletePhotos(photos));
  });
  if (!r.ok) return r;
  revalidatePath("/[locale]/trees", "page");
  return redirectTo("/trees");
}

// ---------------------------------------------------------------- persons

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
  // Back on the chart, `added` lets it select the person and re-centre if the view can't show them yet.
  const chart = chartReturn(treeId, get(fd, "back"));
  if (!chart) return redirectTo(`${treePath(treeId)}/people/${r.data.profile}`);
  const [path, query] = chart.split("?");
  const sp = new URLSearchParams(query);
  sp.set("added", r.data.added);
  return redirectTo(`${path}?${sp}`);
}

export async function updatePersonAction(
  treeId: string,
  personId: string,
  _: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  const r = await savePersonAction(treeId, personId, fd);
  if (!r.ok) return r;
  return redirectTo(`${treePath(treeId)}/people/${personId}`);
}

export async function deletePersonAction(treeId: string, personId: string): Promise<ActionResult> {
  const r = await removePersonAction(treeId, personId);
  if (!r.ok) return r;
  return redirectTo(`${treePath(treeId)}/list`);
}

// The chart's own dialog: same work as the forms above, but no redirect, so the chart stays where it was.

export async function getPersonAction(treeId: string, personId: string) {
  return run((db, u) => tree.getPerson(db, u, treeId, personId));
}

/** Returns the id of the person added (or linked, with `existingId`) so the chart can select them. */
export async function addRelativeAction(treeId: string, fd: FormData): Promise<ActionResult<string>> {
  const r = await run(async (db, u) => {
    const relation = parseRelation(fd);
    const existing = get(fd, "existingId");
    if (!relation || !existing) return tree.createPerson(db, u, treeId, parsePerson(fd), relation);
    const otherId = z.uuid().parse(existing);
    await tree.linkExisting(db, u, treeId, relation, otherId);
    return otherId;
  });
  if (r.ok) refreshTree(treeId);
  return r;
}

export async function savePersonAction(treeId: string, personId: string, fd: FormData): Promise<ActionResult> {
  const r = await run(async (db, u) => {
    const orders = parseBirthOrders(fd);
    const saved = await tree.updatePerson(db, u, treeId, personId, parsePerson(fd), {
      expectedUpdatedAt: get(fd, "updatedAt") || undefined,
      force: get(fd, "force") === "1",
    });
    if (!saved.conflict) for (const o of orders) await tree.updateChildLink(db, u, treeId, o.unionId, personId, o);
    return saved;
  });
  if (!r.ok) return r;
  if (r.data.conflict) {
    return {
      ok: false,
      conflict: true,
      error: (await getTranslations("errors"))("personConflict"),
    };
  }
  refreshTree(treeId);
  return r;
}

export async function removePersonAction(treeId: string, personId: string): Promise<ActionResult> {
  const r = await run(async (db, u) => {
    const photo = await tree.deletePerson(db, u, treeId, personId);
    if (photo) after(() => deletePhotos([photo]));
  });
  if (r.ok) refreshTree(treeId);
  return r;
}

// ---------------------------------------------------------------- unions & child links

export async function updateUnionAction(
  treeId: string,
  unionId: string,
  input: { status: UnionStatus; startYear: string; startMonth: string; startDay: string; orderIndex: number },
) {
  const r = await run((db, u) =>
    tree.updateUnion(db, u, treeId, unionId, {
      status: z.enum(["married", "divorced", "widowed", "unknown"]).parse(input.status),
      startDate: checkedDate(input.startYear, input.startMonth, input.startDay, "start").date,
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
  revalidatePath("/[locale]/trees", "page");
  return redirectTo(`${treePath(r.data)}?welcome=1`);
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
  revalidatePath("/[locale]/trees", "page");
  return redirectTo("/trees");
}

export async function linkMeAction(treeId: string, personId: string | null) {
  const r = await run((db, u) => members.linkMe(db, u, treeId, personId));
  if (r.ok) refreshTree(treeId);
  return r;
}
