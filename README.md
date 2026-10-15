# Wargi — Silsilah Keluarga

Collaborative family-tree web app (UI in Indonesian), part of the Caang Labs catalog. Product scope lives in [`docs/01-prd.md`](docs/01-prd.md).

## Features (v1)

- Trees with persons, unions (multiple marriages, one known parent), and child links (biological / adopted / step).
- Descendant ("bani") and ancestor charts: pan, zoom, collapse branches, re-center, auto-collapse for large trees. Layout runs ELK in a Web Worker.
- "Hubungan dengan saya": link your account to a person, then every profile and chart selection shows the Indonesian kinship term (paman, sepupu dua kali, besan, ipar, …) and lights up the path on the chart.
- List view with search, generation filter, and pagination (the chart is never the only way to read the data).
- Roles (owner / editor / viewer), invite links with expiry and revocation, ownership transfer, change history.
- Photos (compressed in the browser, ≤ 1 MB, served only to members).
- Export: PNG, SVG, and PDF (A4–A1) rendered from chart data; full JSON backup.
- Validation: cycle prevention, self-partner prevention, non-blocking date warnings, edit-conflict detection.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind v4 · shadcn/ui (Base UI) · Drizzle ORM · Postgres (Neon / local) or embedded PGlite · `@xyflow/react` + `elkjs` · Cloudflare R2 · Google sign-in via `arctic` with database sessions.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no configuration:

- **Database**: embedded PGlite in `.data/pglite`, migrated automatically. Set `DATABASE_URL` to use Postgres instead (a local server is migrated on first request; Neon is migrated with `npm run db:migrate`).
- **Sign-in**: a development-only "Masuk tanpa Google" form appears on `/masuk`. Configure `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for Google.
- **Photos**: stored in `.data/uploads`. Configure `R2_*` for Cloudflare R2.
- **Demo data**: on an empty "Pohon saya" page (development only), "Buat pohon contoh" creates a fictional four-generation family of about 100 people.

See [`.env.example`](.env.example) for every variable.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest: kinship terms, graph/layout, SVG export, services and authorization (against in-memory PGlite) |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:generate` | Generate a migration after editing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |

## Code map

- `lib/db/` — Drizzle schema and connection (Neon, node-postgres, or PGlite).
- `lib/access/` — `requireRole`; every service call checks tree membership first.
- `lib/tree/`, `lib/members/` — services (take `db` + `userId`, testable without HTTP); `lib/actions/` wraps them as Server Actions.
- `lib/graph/` — tree → chart graph, auto-collapse, generations, ELK input, SVG export. Pure functions.
- `lib/kinship/` — shortest relation path → Indonesian kinship label. Pure function.
- `lib/auth/` — sessions (hashed tokens in the database) and Google OAuth.
- `lib/storage/` — R2 or local disk.

## Deploying (Vercel + Neon + R2)

1. Create a Neon database and set `DATABASE_URL`; run `npm run db:migrate`.
2. Create a Google OAuth client with redirect URI `https://<domain>/api/auth/google/callback`; set `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
3. Create an R2 bucket and an API token; set the `R2_*` variables.
4. Do **not** set `ALLOW_DEV_LOGIN` in production.
