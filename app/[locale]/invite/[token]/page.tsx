import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirectTo } from "@/i18n/server";
import { AcceptInviteButton } from "@/components/accept-invite-button";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { inspectInvite } from "@/lib/members/service";

export async function generateMetadata({ params }: PageProps<"/[locale]/invite/[token]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.invite" });
  return { title: t("metaTitle") };
}

export default async function InvitePage({ params }: PageProps<"/[locale]/invite/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.invite");
  const user = await getCurrentUser();
  if (!user) return redirectTo(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  const state = await inspectInvite(await getDb(), token, user.id);
  if (state.status === "valid" && state.alreadyMember) return redirectTo(`/trees/${state.treeId}`);

  return (
    <main id="content" className="grid min-h-dvh place-items-center bg-grouped px-4 py-10">
      {/* The same plain column as the sign-in page: no card around the content. */}
      <div className="w-full max-w-md text-center">
        <Wordmark className="justify-center" />
        {state.status === "valid" ? (
          <>
            <p className="mt-6 text-[15px] text-muted-foreground">{t("invitedTo")}</p>
            <h1 className="mt-1 font-display text-[2.125rem] leading-tight tracking-[-0.02em] text-balance">{state.treeName}</h1>
            <p className="mt-3 text-[15px] text-muted-foreground">
              {t.rich(state.role === "editor" ? "asEditor" : "asViewer", {
                role: t(`role.${state.role}`),
                strong: (c) => <strong className="text-foreground">{c}</strong>,
              })}
            </p>
            <p className="mt-2 text-[13px] text-muted-foreground">{t("signedInAs", { email: user.email })}</p>
            <AcceptInviteButton token={token} />
          </>
        ) : (
          <>
            <h1 className="mt-6 font-display text-[1.75rem] leading-tight tracking-[-0.015em] text-balance">
              {t(`problem.${state.status}.title`)}
            </h1>
            <p className="mt-3 text-[15px] text-muted-foreground">
              {t(`problem.${state.status}.body`, { name: state.status === "invalid" ? "" : state.treeName })}
            </p>
            <Link href="/trees" className={buttonVariants({ size: "lg", className: "mt-6 w-full" })}>
              {t("toMyTrees")}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
