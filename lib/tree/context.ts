import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AccessError } from "@/lib/access";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getTree, loadTreeData } from "./service";

/** Everything a tree page needs, loaded once per request and shared by layout and page. */
export const loadTreeContext = cache(async (treeId: string) => {
  const user = await requireUser(`/pohon/${treeId}`);
  const db = await getDb();
  try {
    const { tree, role, personId } = await getTree(db, user.id, treeId);
    const data = await loadTreeData(db, user.id, treeId);
    return { user, db, tree, role, mePersonId: personId, data, canEdit: role !== "viewer", isOwner: role === "owner" };
  } catch (e) {
    if (e instanceof AccessError) notFound();
    throw e;
  }
});
