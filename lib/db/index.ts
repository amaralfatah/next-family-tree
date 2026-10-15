import "server-only";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const isNeon = (url: string) => /\.neon\.tech(:\d+)?\//.test(url) || url.includes(".neon.tech");

/**
 * - DATABASE_URL on Neon: serverless driver (production on Vercel), migrated with `npm run db:migrate`.
 * - DATABASE_URL elsewhere (e.g. local Postgres): node-postgres, migrated on first use.
 * - No DATABASE_URL: embedded PGlite on disk, migrated on first use. Zero setup.
 */
async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url && isNeon(url)) {
    const { Pool } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    return drizzle({ client: new Pool({ connectionString: url }), schema }) as unknown as DB;
  }
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const db = drizzle({ client: new Pool({ connectionString: url, max: 10 }), schema });
    await migrate(db, { migrationsFolder: "drizzle" });
    return db as unknown as DB;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { mkdir } = await import("node:fs/promises");
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  await mkdir(dir, { recursive: true });
  const db = drizzle({ client: new PGlite(dir), schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db as unknown as DB;
}

const globalForDb = globalThis as unknown as { wargiDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  // A failed connection is not cached, so the next request retries.
  globalForDb.wargiDb ??= connect().catch((e) => {
    globalForDb.wargiDb = undefined;
    throw e;
  });
  return globalForDb.wargiDb;
}

export { schema };
