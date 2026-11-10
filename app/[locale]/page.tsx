import { ArrowRightIcon, HistoryIcon, LockIcon, Trash2Icon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import { Link } from "@/i18n/navigation";
import { redirectTo } from "@/i18n/server";
import { navBar } from "@/components/nav-bar";
import { PreferencesInline } from "@/components/preferences";
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
const shotFrame =
  "rounded-xl sm:rounded-2xl shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_-12px_rgb(0_0_0/0.24)] ring-1 ring-black/8 dark:ring-white/10";

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
          <Link
            href="/"
            aria-label={t("homeLabel")}
            className="mr-auto flex items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Wordmark />
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "ghost", className: "hit" })}>
            {t("signIn")}
          </Link>
        </div>
      </header>

      <main id="content" className="flex-1">
        <section className="px-4 pt-10 pb-12 text-center sm:px-6 sm:pt-16 sm:pb-16 md:pt-22 md:pb-20">
          <h1 className="mx-auto max-w-3xl font-display text-[2.125rem] leading-[1.08] tracking-[-0.025em] text-balance sm:text-5xl md:text-6xl lg:text-[4rem]">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-pretty text-muted-foreground sm:mt-5 sm:text-xl">
            {t("heroBody")}
          </p>
          <div className="mx-auto mt-7 flex max-w-xs flex-col items-stretch gap-2.5 sm:mt-8 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-3.5">
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              {t("createTree")}
            </Link>
            <Link href="/example" className={buttonVariants({ variant: "outline", size: "lg", className: "gap-1.5" })}>
              <span>{t("seeExample")}</span>
              <ArrowRightIcon className="size-4 opacity-70" aria-hidden />
            </Link>
          </div>
          <div className="mx-auto mt-10 max-w-5xl sm:mt-14 md:mt-16">
            <Shot
              light={chartLight}
              dark={chartDark}
              alt={t("chartAlt")}
              priority
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="aspect-[16/10] rounded-xl object-cover object-left-top shadow-[0_2px_6px_rgb(0_0_0/0.06),0_24px_48px_-16px_rgb(0_0_0/0.28)] ring-1 ring-black/10 sm:aspect-auto dark:ring-white/10"
            />
          </div>
        </section>

        <section className="border-y border-border/60 bg-grouped px-4 py-12 sm:px-6 sm:py-16 md:py-24">
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2 md:gap-6">
            <Tile title={t("tileTermsTitle")} body={t("tileTermsBody")}>
              <Shot
                light={sheetLight}
                dark={sheetDark}
                alt={t("sheetAlt")}
                sizes="(min-width: 768px) 440px, 92vw"
                className={shotFrame}
              />
            </Tile>
            <Tile title={t("tileTogetherTitle")} body={t("tileTogetherBody")}>
              <Shot
                light={addLight}
                dark={addDark}
                alt={t("addAlt")}
                sizes="(min-width: 768px) 440px, 92vw"
                className={shotFrame}
              />
            </Tile>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-20 md:py-24">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center font-display text-[1.875rem] leading-tight tracking-[-0.02em] text-balance sm:text-4xl md:text-5xl">
              {t("promisesTitle")}
            </h2>
            <ul className="mt-8 divide-y divide-border/70 overflow-hidden rounded-2xl bg-paper-2 ring-1 ring-border/70 sm:mt-10 dark:ring-white/8">
              {PROMISES.map(({ icon: Icon, key }) => (
                <li key={key} className="flex gap-3.5 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[1rem] font-semibold sm:text-[1.0625rem]">{t(`promises.${key}.title`)}</p>
                    <p className="mt-1 text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">
                      {t(`promises.${key}.body`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-sm">
              <Link
                href="/privacy"
                className="inline-flex min-h-10 items-center gap-1.5 text-[15px] font-medium text-primary hover:opacity-80 active:opacity-60"
              >
                <span>{t("readPrivacy")}</span>
                <ArrowRightIcon className="size-3.5" aria-hidden />
              </Link>
            </p>
          </div>
        </section>

        <section className="px-4 pb-14 sm:px-6 sm:pb-20 md:pb-24">
          <div className="mx-auto max-w-5xl rounded-2xl bg-paper-2 px-6 py-12 text-center ring-1 ring-border/70 sm:rounded-3xl sm:px-12 sm:py-16 dark:ring-white/8">
            <h2 className="mx-auto max-w-xl font-display text-[1.875rem] leading-tight tracking-[-0.02em] text-balance sm:text-4xl md:text-5xl">
              {t("closingTitle")}
            </h2>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-2.5 sm:mt-8 sm:flex-row sm:items-center sm:gap-3.5">
              <Link href="/login" className={buttonVariants({ size: "lg" })}>
                {t("createTree")}
              </Link>
              <Link href="/example" className={buttonVariants({ variant: "outline", size: "lg" })}>
                {t("seeExample")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-paper-2 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-5xl px-4 py-6 text-[13px] text-muted-foreground sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-5">
            <span>{t("footerNote")}</span>
            <nav className="flex items-center gap-5">
              <Link href="/privacy" className="inline-flex min-h-9 items-center hover:text-foreground">
                {t("privacy")}
              </Link>
              <Link href="/login" className="inline-flex min-h-9 items-center hover:text-foreground">
                {t("signIn")}
              </Link>
            </nav>
          </div>
          <PreferencesInline className="mt-3 border-t border-border/70 pt-3.5 pb-1" />
        </div>
      </footer>
    </div>
  );
}

/** A feature tile on the grouped background: the claim on top, the product underneath. */
function Tile({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col justify-between overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-border/70 sm:rounded-3xl sm:p-7 md:p-9 dark:ring-white/8">
      <div>
        <h2 className="font-display text-[1.5rem] leading-tight text-balance sm:text-2xl md:text-[1.75rem]">{title}</h2>
        <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground sm:mt-3 sm:text-[1.0625rem]">
          {body}
        </p>
      </div>
      <div className="mt-6 sm:mt-8">{children}</div>
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
      <Image
        src={light}
        alt={alt}
        sizes={sizes}
        priority={priority}
        placeholder="blur"
        className={cn("w-full dark:hidden", className)}
      />
      <Image
        src={dark}
        alt={alt}
        sizes={sizes}
        placeholder="blur"
        className={cn("hidden w-full dark:block", className)}
      />
    </>
  );
}
