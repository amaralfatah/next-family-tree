import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PreferencesInline } from "@/components/preferences";
import { Wordmark } from "@/components/wordmark";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.privacy" });
  return { title: t("title") };
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.privacy");
  return (
    <main id="content" className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="inline-block rounded-md outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50">
        <Wordmark />
      </Link>
      <h1 className="mt-8 font-display text-[2.125rem] leading-tight tracking-[-0.02em]">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("intro")}</p>
      <div className="mt-8 flex flex-col gap-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="font-semibold">{t("filledTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("filledBody")}</p>
        </section>
        <section>
          <h2 className="font-semibold">{t("privateTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("privateBody")}</p>
        </section>
        <section>
          <h2 className="font-semibold">{t("rightsTitle")}</h2>
          <p className="mt-1 text-muted-foreground">
            {t.rich("rightsBody", {
              email: (c) => (
                <a className="underline underline-offset-2 hover:text-foreground" href="mailto:hello@caanglabs.com">
                  {c}
                </a>
              ),
            })}
          </p>
        </section>
        <section>
          <h2 className="font-semibold">{t("deletionTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("deletionBody")}</p>
        </section>
      </div>
      <PreferencesInline className="mt-12 border-t border-border/70 pt-2" />
    </main>
  );
}
