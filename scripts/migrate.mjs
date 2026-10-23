// Applies ./drizzle migrations to DATABASE_URL (Neon or any Postgres).
// On Neon, prefers the direct DATABASE_URL_UNPOOLED: migrations need a session, not PgBouncer.
// Without DATABASE_URL the app uses embedded PGlite, which migrates itself.
if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL not set; local PGlite migrates automatically on first request.");
  process.exit(0);
}

// Same as lib/db: make Neon's `sslmode=require` explicit as verify-full to silence pg's warning.
const url = (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL).replace(
  /([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/,
  "$1verify-full",
);
const { default: pg } = await import("pg");
const { drizzle } = await import("drizzle-orm/node-postgres");
const { migrate } = await import("drizzle-orm/node-postgres/migrator");
const pool = new pg.Pool({ connectionString: url });
await migrate(drizzle({ client: pool }), { migrationsFolder: "drizzle" });
await pool.end();
console.log("Migrations applied.");
