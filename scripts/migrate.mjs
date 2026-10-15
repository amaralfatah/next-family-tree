// Applies ./drizzle migrations to DATABASE_URL (Neon or any Postgres).
// Without DATABASE_URL the app uses embedded PGlite, which migrates itself.
if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL not set; local PGlite migrates automatically on first request.");
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (url.includes(".neon.tech")) {
  const { Pool } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
  const pool = new Pool({ connectionString: url });
  await migrate(drizzle({ client: pool }), { migrationsFolder: "drizzle" });
  await pool.end();
} else {
  const { default: pg } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const pool = new pg.Pool({ connectionString: url });
  await migrate(drizzle({ client: pool }), { migrationsFolder: "drizzle" });
  await pool.end();
}
console.log("Migrations applied.");
