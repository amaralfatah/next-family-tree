import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AccessError } from "@/lib/access";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getTree, loadTreeDataWith } from "./service";

/** The user, their membership and the tree row: enough for the layout and pages that don't draw the tree. */
export const loadTreeMeta = cache(async (treeId: string) => {
  const user = await requireUser(`/trees/${treeId}`);
  const db = await getDb();
  try {
    const { tree, access, role, personId } = await getTree(db, user.id, treeId);
    return { user, db, tree, access, role, mePersonId: personId, canEdit: role !== "viewer", isOwner: role === "owner" };
  } catch (e) {
    if (e instanceof AccessError) notFound();
    throw e;
  }
});

/** Everything a tree page needs, loaded once per request and shared by layout and page. */
export const loadTreeContext = cache(async (treeId: string) => {
  const meta = await loadTreeMeta(treeId);
  const data = await loadTreeDataWith(meta.db, meta.access);
  return { ...meta, data };
});
