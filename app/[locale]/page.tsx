import { HistoryIcon, LockIcon, Trash2Icon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import { Link } from "@/i18n/navigation";
import { redirectTo } from "@/i18n/server";
import { navBar } from "@/components/nav-bar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { getCurrentUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
// Real screenshots of /example and /demo (the fictional demo family), light and dark.
import addDark from "@/public/landing/add-dark.png";
import addLight from "@/public/landing/add-light.png";
import chartDark from "@/public/landing/chart-dark.png";
import chartLight from "@/public/landing/chart-light.png";
import sheetDark from "@/public/landing/sheet-dark.png";
import sheetLight from "@/public/landing/sheet-light.png";

// A real piece of the app lifted onto the tile: hairline and soft shadow so white UI reads on a white tile.
const shotFrame = "rounded-2xl shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_-12px_rgb(0_0_0/0.2)] ring-1 ring-black/8 dark:ring-white/10";

const PROMISES = [
  { icon: LockIcon, key: "invitedOnly" },
  { icon: HistoryIcon, key: "history" },
  { icon: Trash2Icon, key: "deletable" },
] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.landing" });
  return { title: { absolute: t("metaTitle") }, description: t("metaDescription") };
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getCurrentUser()) return redirectTo("/trees");
  const t = await getTranslations("public.landing");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className={navBar}>
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-1 px-4 sm:px-6">
          <Link href="/" aria-label={t("homeLabel")} className="mr-auto flex items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
            <Wordmark />
          </Link>
          <ThemeToggle label={t("toggleTheme")} />
          <Link href="/login" className={buttonVariants({ variant: "ghost", className: "hit" })}>
            {t("signIn")}
          </Link>
        </div>
      </header>

      <main id="content" className="flex-1">
        <section className="px-4 pt-16 text-center sm:px-6 md:pt-24">
          <h1 className="mx-auto max-w-3xl font-display text-[2.75rem] leading-[1.05] tracking-[-0.025em] text-balance sm:text-6xl md:text-7xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-xl leading-snug text-pretty text-muted-foreground md:text-2xl">
            {t("heroBody")}
          </p>
          {/* Phones: one full-width action with the secondary link under it; wider screens: side by side. */}
          <div className="mx-auto mt-8 flex max-w-xs flex-col items-stretch gap-1 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-6">
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              {t("createTree")}
            </Link>
            <Link href="/example" className="inline-flex h-11 items-center justify-center rounded-sm text-[1.0625rem] text-primary outline-none hover:opacity-80 active:opacity-60 focus-visible:ring-3 focus-visible:ring-ring/40">
              {t("seeExample")}
            </Link>
          </div>
          {/* On phones the desktop window is too small to read; the tiles below carry the product instead. */}
          <div className="mx-auto mt-14 hidden max-w-5xl sm:block md:mt-20">
            <Shot
              light={chartLight}
              dark={chartDark}
              alt={t("chartAlt")}
              priority
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="rounded-xl shadow-[0_2px_6px_rgb(0_0_0/0.06),0_30px_60px_-20px_rgb(0_0_0/0.25)] ring-1 ring-black/10 dark:ring-white/10"
            />
          </div>
        </section>

        <section className="mt-16 bg-grouped px-4 py-16 sm:px-6 md:mt-24 md:py-24">
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
            <Tile title={t("tileTermsTitle")} body={t("tileTermsBody")}>
              <div className="flex h-full items-center px-7 pb-8 md:px-9">
                <Shot light={sheetLight} dark={sheetDark} alt={t("sheetAlt")} sizes="(min-width: 768px) 400px, 90vw" className={shotFrame} />
              </div>
            </Tile>
            <Tile title={t("tileTogetherTitle")} body={t("tileTogetherBody")}>
              <div className="h-52 overflow-hidden px-7 sm:h-full md:px-9">
                <Shot light={addLight} dark={addDark} alt={t("addAlt")} sizes="(min-width: 768px) 400px, 90vw" className={cn(shotFrame, "rounded-b-none")} />
              </div>
            </Tile>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 md:py-24">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center font-display text-4xl leading-tight tracking-[-0.02em] text-balance md:text-5xl">{t("promisesTitle")}</h2>
            {/* An inset grouped list, as in iOS Settings. */}
            <ul className="mt-12 divide-y divide-border/70 overflow-hidden rounded-xl bg-paper-2">
              {PROMISES.map(({ icon: Icon, key }) => (
                <li key={key} className="flex gap-4 px-5 py-4">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-background text-foreground">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[1.0625rem] font-semibold">{t(`promises.${key}.title`)}</p>
                    <p className="mt-0.5 text-[0.9375rem] leading-snug text-pretty text-muted-foreground">{t(`promises.${key}.body`)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-center text-sm">
              <Link href="/privacy" className="inline-flex min-h-11 items-center text-[15px] text-primary hover:opacity-80 active:opacity-60">
                {t("readPrivacy")}
              </Link>
            </p>
          </div>
        </section>

        <section className="border-t px-4 py-20 text-center sm:px-6 md:py-24">
          <h2 className="mx-auto max-w-2xl font-display text-4xl leading-tight tracking-[-0.02em] text-balance md:text-5xl">{t("closingTitle")}</h2>
          <Link href="/login" className={buttonVariants({ size: "lg", className: "mt-8" })}>
            {t("createTree")}
          </Link>
        </section>
      </main>

      <footer className="bg-paper-2 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-muted-foreground sm:px-6">
          <span>{t("footerNote")}</span>
          <nav className="flex items-center gap-5">
            <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-foreground">
              {t("privacy")}
            </Link>
            <Link href="/login" className="inline-flex min-h-11 items-center hover:text-foreground">
              {t("signIn")}
            </Link>
            <LanguageSwitcher variant="inline" />
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** A feature tile on the grouped background: the claim on top, the product underneath. */
function Tile({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-3xl bg-card">
      <div className="px-7 pt-8 md:px-9 md:pt-10">
        <h2 className="font-display text-2xl leading-tight text-balance md:text-[1.75rem]">{title}</h2>
        <p className="mt-3 text-[1.0625rem] leading-snug text-pretty text-muted-foreground">{body}</p>
      </div>
      {/* The same height in both tiles, so their bottoms line up; a tall shot is cut by the tile's edge. */}
      <div className="mt-8 max-h-64 sm:h-72 sm:max-h-none">{children}</div>
    </article>
  );
}

/** One screenshot per theme; the page's .dark class picks which shows. */
function Shot({
  light,
  dark,
  alt,
  className,
  sizes,
  priority = false,
}: {
  light: StaticImageData;
  dark: StaticImageData;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <>
      <Image src={light} alt={alt} sizes={sizes} priority={priority} placeholder="blur" className={cn("w-full dark:hidden", className)} />
      <Image src={dark} alt={alt} sizes={sizes} placeholder="blur" className={cn("hidden w-full dark:block", className)} />
    </>
  );
}
