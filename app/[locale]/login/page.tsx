import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirectTo } from "@/i18n/server";
import { PreferencesInline } from "@/components/preferences";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Wordmark } from "@/components/wordmark";
import { getCurrentUser, googleEnabled, safeNext } from "@/lib/auth/session";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.login" });
  return { title: t("title") };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.login");
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  if (await getCurrentUser()) return redirectTo(next);
  const google = googleEnabled();
  const fromInvite = next.startsWith("/invite/");

  return (
    <main id="content" className="grid min-h-dvh place-items-center bg-grouped px-4 py-10">
      {/* A plain column on the grouped background, no card around it: the groups inside are the only cards. */}
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-block rounded-md outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50">
          <Wordmark />
        </Link>
        <h1 className="mt-6 font-display text-[1.75rem] leading-tight tracking-[-0.015em] text-balance">{fromInvite ? t("titleInvite") : t("title")}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {fromInvite ? t("bodyInvite") : t("body")}
        </p>

        {google ? (
          <GoogleSignInButton next={next} failed={sp.error === "google"} />
        ) : (
          <p className="mt-6 text-[13px] text-muted-foreground">{t("googleUnavailable")}</p>
        )}

        <p className="mt-6 text-[13px] text-muted-foreground">
          {t("consent")}{" "}
          <Link href="/privacy" className="text-soga-ink hover:opacity-80 active:opacity-60">
            {t("privacyPolicy")}
          </Link>
        </p>
        <PreferencesInline className="mt-8 border-t border-border/70 pt-3.5 pb-1.5" />
      </div>
    </main>
  );
}
