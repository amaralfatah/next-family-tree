import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { navBar } from "@/components/nav-bar";
import { FamilyChart } from "@/components/chart/family-chart";
import { PreferencesMenu } from "@/components/preferences";
import { buttonVariants } from "@/components/ui/button";
import { Mark, Wordmark } from "@/components/wordmark";
import { loadPublicDemo } from "@/lib/demo-public";

export async function generateMetadata({ params }: PageProps<"/[locale]/example">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.example" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

// Built once at build time from the fictional demo generator; no session or real data involved.
export const dynamic = "force-static";

export default async function ExamplePage({ params }: PageProps<"/[locale]/example">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.example");
  const demo = await loadPublicDemo();
  const me = demo.data.persons.find((p) => p.id === demo.meId)!;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className={navBar}>
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" aria-label={t("homeLabel")} className="flex shrink-0 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
            <Mark className="sm:hidden" />
            <Wordmark className="hidden sm:inline-flex" />
          </Link>
          <span className="min-w-0 flex-1 truncate border-l border-border pl-3 font-display text-lg sm:text-xl">{demo.name}</span>
          <Link href="/login" className={buttonVariants({ className: "hit" })}>
            {t("createTree")}
          </Link>
          <PreferencesMenu />
        </div>
      </header>
      <main id="content" className="flex flex-1 flex-col">
        <h1 className="sr-only">{t("heading", { name: demo.name })}</h1>
        <div className="no-print border-b bg-paper-2">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-[13px] sm:py-2.5 sm:text-sm">
            <p className="min-w-0 flex-1">
              {t.rich("banner", { name: me.fullName, strong: (c) => <strong className="font-semibold">{c}</strong> })}
              <span className="max-sm:hidden"> {t("bannerHint")}</span>
            </p>
            <Link href="/demo" className={buttonVariants({ variant: "outline", className: "hit shrink-0" })}>
              {t("tryEditing")}
            </Link>
          </div>
        </div>
        <Suspense>
          <FamilyChart
            treeId="contoh"
            data={demo.data}
            rootPersonId={demo.focusId}
            mePersonId={demo.meId}
            canEdit={false}
            demo
            initialSelectedId={demo.relativeId}
          />
        </Suspense>
      </main>
    </div>
  );
}
