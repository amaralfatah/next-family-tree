// In-memory Postgres (PGlite) with the real migrations, for service and authorization tests.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { DB } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export async function createTestDb(): Promise<DB> {
  const db = drizzle({ client: new PGlite(), schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db as unknown as DB;
}

export async function createUser(db: DB, name: string): Promise<string> {
  const [u] = await db
    .insert(schema.users)
    .values({ name, email: `${name.toLowerCase()}@contoh.id` })
    .returning({ id: schema.users.id });
  return u.id;
}
