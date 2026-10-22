import "server-only";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { DB } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { createDemoTree, demoView } from "@/lib/demo";
import { getTree, loadTreeData } from "@/lib/tree/service";
import type { TreeData } from "@/lib/types";

export interface PublicDemo {
  name: string;
  data: TreeData;
  /** Chart centre: the grandparent of `meId`, so the first view shows three generations around "Saya". */
  focusId: string;
  meId: string;
  /** A sibling of my parent, pre-selected so the kinship label and soga path show without a tap. */
  relativeId: string;
}

let cached: Promise<PublicDemo> | undefined;

/**
 * The fictional demo family for the public /contoh page, built in an in-memory database from the same
 * generator as the in-app demo. The page is static, so this runs once at build time; no real data is read.
 * Cached per process because ids are random: every render must see the same family.
 */
export function loadPublicDemo(): Promise<PublicDemo> {
  cached ??= buildPublicDemo().catch((e) => {
    cached = undefined;
    throw e;
  });
  return cached;
}

async function buildPublicDemo(): Promise<PublicDemo> {
  const pglite = drizzle({ client: new PGlite(), schema });
  await migrate(pglite, { migrationsFolder: "drizzle" });
  const db = pglite as unknown as DB;
  const [user] = await db.insert(schema.users).values({ name: "Contoh", email: "contoh@sararia.invalid" }).returning({ id: schema.users.id });
  const treeId = await createDemoTree(db, user.id);
  const [{ tree }, data] = await Promise.all([getTree(db, user.id, treeId), loadTreeData(db, user.id, treeId)]);

  return { name: tree.name, data, ...demoView(data) };
}
