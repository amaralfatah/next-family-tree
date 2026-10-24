import { readFile } from "node:fs/promises";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import path from "node:path";
import { DemoSandbox } from "@/components/demo-sandbox";

export async function generateMetadata({ params }: PageProps<"/[locale]/demo">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.demo" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

// Static: the migrations are read once at build time and the sandbox database runs entirely in the browser.
export const dynamic = "force-static";

export default async function DemoPage({ params }: PageProps<"/[locale]/demo">) {
  setRequestLocale((await params).locale);
  return <DemoSandbox migrations={await readMigrations()} />;
}

/** The ./drizzle migrations in journal order, so the in-browser database has the same schema as production. */
async function readMigrations(): Promise<string[]> {
  const dir = path.join(process.cwd(), "drizzle");
  const journal = JSON.parse(await readFile(path.join(dir, "meta", "_journal.json"), "utf8")) as { entries: { tag: string }[] };
  return Promise.all(journal.entries.map((e) => readFile(path.join(dir, `${e.tag}.sql`), "utf8")));
}
