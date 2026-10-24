import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { LinkMeButton } from "@/components/link-me-button";
import { ListFilters } from "@/components/list-filters";
import { PersonAvatar } from "@/components/person-avatar";
import { Page, PageTitle } from "@/components/page-shell";
import { toolbarAction } from "@/components/form-row-classes";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { generations } from "@/lib/graph/build";
import { createKinshipResolver, type KinshipLocale } from "@/lib/kinship";
import { subtitle } from "@/lib/person";
import { loadTreeContext } from "@/lib/tree/context";

export async function generateMetadata({ params }: PageProps<"/[locale]/trees/[treeId]/list">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "trees" });
  return { title: t("list.metaTitle") };
}

const PAGE = 50;

export default async function ListPage({ params, searchParams }: PageProps<"/[locale]/trees/[treeId]/list">) {
  const { locale, treeId } = await params;
  const sp = await searchParams;
  const t = await getTranslations("trees");
  const { tree, data, mePersonId, canEdit } = await loadTreeContext(treeId);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const gen = typeof sp.gen === "string" && sp.gen !== "" ? Number(sp.gen) : null;
  const page = Math.max(1, Number(sp.page) || 1);
  const findMe = sp["find-me"] === "1" && !mePersonId;

  const root = tree.rootPersonId ?? data.persons[0]?.id;
  const genOf = root ? generations(data, root) : new Map<string, number>();
  const genValues = [...new Set(genOf.values())].sort((a, b) => a - b);

  const needle = q.toLowerCase();
  const filtered = data.persons
    .filter((p) => !needle || p.fullName.toLowerCase().includes(needle) || p.nickname?.toLowerCase().includes(needle) || p.birthPlace?.toLowerCase().includes(needle))
    .filter((p) => gen === null || genOf.get(p.id) === gen)
    .sort((a, b) => (genOf.get(a.id) ?? 99) - (genOf.get(b.id) ?? 99) || a.fullName.localeCompare(b.fullName, locale));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);

  const href = (over: Record<string, string | number | null>) => {
    const u = new URLSearchParams();
    const merged = { q: q || null, gen: gen ?? null, page: page > 1 ? page : null, "find-me": findMe ? "1" : null, ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== null && v !== "") u.set(k, String(v));
    const s = u.toString();
    return `/trees/${treeId}/list${s ? `?${s}` : ""}`;
  };

  const kinOf = mePersonId ? createKinshipResolver(data, mePersonId, locale as KinshipLocale) : null;
  return (
    <Page wide>
      <PageTitle
        title={t("list.title")}
        subtitle={t("list.subtitle", { count: data.persons.length })}
        action={
          canEdit ? (
            <Link href={`/trees/${treeId}/people/new`} className={toolbarAction}>
              <PlusIcon className="size-5" /> {t("list.addPerson")}
            </Link>
          ) : null
        }
      />

      {findMe ? (
        <p className="mt-6 px-4 text-[15px]">
          <strong className="font-semibold">{t("list.findMeLead")}</strong>{" "}
          <span className="text-muted-foreground">{t("list.findMeBody")}</span>
        </p>
      ) : null}

      <Suspense>
        <ListFilters q={q} gen={gen} generations={genValues} autoFocus={findMe} />
      </Suspense>

      {rows.length === 0 ? (
        <Empty className="mt-6 bg-card">
          <EmptyHeader>
            <EmptyTitle>{t("list.emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("list.emptyBody")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="mt-6 divide-y overflow-hidden rounded-xl bg-card">
          {rows.map((p) => {
            const kin = kinOf && p.id !== mePersonId ? kinOf(p.id) : null;
            return (
              // The whole row opens the profile, as a list row on iOS: it highlights, with a chevron, no underline.
              <li key={p.id} className="relative flex min-h-14 items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-muted/50 has-[a:active]:bg-muted has-[a:active]:duration-0 has-[a:focus-visible]:bg-accent/40 sm:px-4">
                <PersonAvatar treeId={treeId} person={p} size="sm" />
                <Link href={`/trees/${treeId}/people/${p.id}`} className="min-w-0 flex-1 outline-none after:absolute after:inset-0 after:content-['']">
                  <span className="block truncate font-medium">
                    {p.fullName}
                    {p.nickname ? <span className="font-normal text-muted-foreground"> “{p.nickname}”</span> : null}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[subtitle(p), p.birthPlace].filter(Boolean).join(" · ") || "—"}
                  </span>
                  {/* Phones: the relation column is hidden, so the kinship term joins the name instead. */}
                  {p.id === mePersonId ? (
                    <span className="block text-[13px] font-medium sm:hidden">{t("list.me")}</span>
                  ) : kin ? (
                    <span className="block truncate text-[13px] text-foreground/80 sm:hidden">{kin.label}</span>
                  ) : null}
                </Link>
                <span className="hidden shrink-0 text-right text-sm sm:block">
                  {p.id === mePersonId ? (
                    <span className="font-medium">{t("list.me")}</span>
                  ) : kin ? (
                    <span>{kin.label}</span>
                  ) : null}
                  {genOf.has(p.id) ? <span className="block text-xs text-muted-foreground tabular-nums">{t("list.generation", { n: genOf.get(p.id)! })}</span> : null}
                </span>
                {findMe ? (
                  <span className="relative z-10">
                    <LinkMeButton treeId={treeId} personId={p.id} />
                  </span>
                ) : (
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label={t("list.pagesAria")} className="mt-6 flex items-center justify-center gap-2 text-[15px]">
          {page > 1 ? (
            <Link href={href({ page: page - 1 })} className={toolbarAction}>
              {t("list.previous")}
            </Link>
          ) : null}
          <span className="px-2 text-muted-foreground tabular-nums">
            {t("list.pageOf", { page, pages })}
          </span>
          {page < pages ? (
            <Link href={href({ page: page + 1 })} className={toolbarAction}>
              {t("list.next")}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </Page>
  );
}
