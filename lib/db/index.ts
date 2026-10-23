import "server-only";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const isNeon = (url: string) => /\.neon\.tech(:\d+)?\//.test(url) || url.includes(".neon.tech");

// Neon hands out `sslmode=require`, which pg already treats as verify-full but warns about on every
// start. Spell out verify-full so the behaviour stays the same and the warning goes away.
const strictSsl = (url: string) => url.replace(/([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/, "$1verify-full");

/**
 * - DATABASE_URL on Neon (the pooled `-pooler` URL from `neon env pull`): node-postgres, with the pool
 *   attached to Vercel Fluid compute so idle clients are released before suspend. Migrated with
 *   `npm run db:migrate`, which uses DATABASE_URL_UNPOOLED.
 * - DATABASE_URL elsewhere (e.g. local Postgres): node-postgres, migrated on first use.
 * - No DATABASE_URL: embedded PGlite on disk, migrated on first use. Zero setup.
 */
async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url && isNeon(url)) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { attachDatabasePool } = await import("@vercel/functions");
    const pool = new Pool({ connectionString: strictSsl(url) });
    attachDatabasePool(pool);
    return drizzle({ client: pool, schema }) as unknown as DB;
  }
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const db = drizzle({ client: new Pool({ connectionString: strictSsl(url), max: 10 }), schema });
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

const globalForDb = globalThis as unknown as { wargiDb?: Promise<DB>; wargiDbUrl?: string };

export function getDb(): Promise<DB> {
  // Keyed by DATABASE_URL: `next dev` reloads .env files without restarting, so a changed URL gets a new connection.
  const url = process.env.DATABASE_URL ?? "";
  if (globalForDb.wargiDbUrl !== url) {
    globalForDb.wargiDb = undefined;
    globalForDb.wargiDbUrl = url;
  }
  // A failed connection is not cached, so the next request retries.
  globalForDb.wargiDb ??= connect().catch((e) => {
    globalForDb.wargiDb = undefined;
    throw e;
  });
  return globalForDb.wargiDb;
}

export { schema };
