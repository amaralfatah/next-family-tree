import { readFile } from "node:fs/promises";
import path from "node:path";
import { DemoSandbox } from "@/components/demo-sandbox";

export const metadata = {
  title: "Coba ubah pohon keluarga",
  description: "Tambah, ubah, dan hapus anggota keluarga fiktif tanpa masuk. Semua perubahan hanya ada di browser Anda.",
};

// Static: the migrations are read once at build time and the sandbox database runs entirely in the browser.
export const dynamic = "force-static";

export default async function DemoPage() {
  return <DemoSandbox migrations={await readMigrations()} />;
}

/** The ./drizzle migrations in journal order, so the in-browser database has the same schema as production. */
async function readMigrations(): Promise<string[]> {
  const dir = path.join(process.cwd(), "drizzle");
  const journal = JSON.parse(await readFile(path.join(dir, "meta", "_journal.json"), "utf8")) as { entries: { tag: string }[] };
  return Promise.all(journal.entries.map((e) => readFile(path.join(dir, `${e.tag}.sql`), "utf8")));
}
