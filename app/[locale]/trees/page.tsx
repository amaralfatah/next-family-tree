import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppHeader } from "@/components/app-header";
import { toolbarAction } from "@/components/form-row-classes";
import { Page, PageTitle } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { devLoginEnabled, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listTreesForUser } from "@/lib/tree/service";

export async function generateMetadata({ params }: PageProps<"/[locale]/trees">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "trees" });
  return { title: t("index.metaTitle") };
}

export default async function TreesPage() {
  const t = await getTranslations("trees");
  const user = await requireUser("/trees");
  const list = await listTreesForUser(await getDb(), user.id);

  return (
    <>
      <AppHeader user={user} />
      <div className="min-h-[calc(100dvh-3.5rem)] bg-grouped">
        <Page>
          <PageTitle
            eyebrow={t("index.greeting", { name: user.name.split(" ")[0] })}
            title={t("index.title")}
            action={
              list.length > 0 ? (
                <Link href="/trees/new" className={toolbarAction}>
                  <PlusIcon className="size-5" /> {t("index.newTree")}
                </Link>
              ) : null
            }
          />

          {list.length === 0 ? (
            <Empty className="mt-6 rounded-xl bg-card">
              <EmptyHeader>
                <EmptyTitle>{t("index.emptyTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("index.emptyBody")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link href="/trees/new" className={buttonVariants({ size: "lg" })}>
                  <PlusIcon data-icon="inline-start" /> {t("index.createFirst")}
                </Link>
                <p className="text-sm text-muted-foreground">{t("index.invitedHint")}</p>
                {devLoginEnabled() ? (
                  <form action="/api/dev/sample" method="post">
                    <button type="submit" className={toolbarAction}>
                      {t("index.sampleButton")}
                    </button>
                  </form>
                ) : null}
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="mt-6 divide-y divide-border/70 overflow-hidden rounded-xl bg-card">
              {list.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/trees/${item.id}`}
                    className="flex min-h-14 items-center gap-4 px-4 py-3 transition-colors duration-150 outline-none hover:bg-muted/50 focus-visible:bg-accent/40 active:bg-muted active:duration-0"
                  >
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[1.0625rem] font-semibold">{item.name}</h2>
                      {item.description ? <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{item.description}</p> : null}
                    </div>
                    <span className="shrink-0 text-right text-[15px] text-muted-foreground tabular-nums">
                      {t("index.peopleCount", { count: item.personCount })}
                      <span className="block text-[13px]">{t(`roles.${item.role}`)}</span>
                    </span>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Page>
      </div>
    </>
  );
}
