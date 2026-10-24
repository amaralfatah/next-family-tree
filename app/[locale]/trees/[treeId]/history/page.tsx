import { ChevronRightIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { toolbarAction } from "@/components/form-row-classes";
import { Page, PageTitle } from "@/components/page-shell";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { decodeSummary } from "@/lib/log-summary";
import { cn } from "@/lib/utils";
import { loadTreeContext } from "@/lib/tree/context";
import { listChangesWith } from "@/lib/tree/service";

export async function generateMetadata({ params }: PageProps<"/[locale]/trees/[treeId]/history">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "trees" });
  return { title: t("history.metaTitle") };
}

const FIELDS = new Set(["fullName", "nickname", "gender", "birthDate", "birthPrecision", "birthPlace", "isLiving", "deathDate", "deathPrecision", "notes"]);
const TIME_ZONE = "Asia/Jakarta";

export default async function HistoryPage({ params, searchParams }: PageProps<"/[locale]/trees/[treeId]/history">) {
  const { treeId } = await params;
  const sp = await searchParams;
  const t = await getTranslations("trees");
  const format = await getFormatter();
  const dayOf = (d: Date) => format.dateTime(d, { dateStyle: "full", timeZone: TIME_ZONE });
  const timeOf = (d: Date) => format.dateTime(d, { timeStyle: "short", timeZone: TIME_ZONE });
  // New rows hold a message key and values; older rows hold plain text, shown as stored.
  const summaryOf = (summary: string) => {
    const decoded = decodeSummary(summary);
    return decoded ? t(`log.${decoded.key}`, decoded.values) : summary;
  };
  const { db, access, data } = await loadTreeContext(treeId);
  const before = typeof sp.before === "string" && !Number.isNaN(Date.parse(sp.before)) ? new Date(sp.before) : undefined;
  const { rows, hasMore } = await listChangesWith(db, access, { before, limit: 50 });
  const existing = new Set(data.persons.map((p) => p.id));

  return (
    <Page>
      <PageTitle title={t("history.title")} subtitle={t("history.subtitle")} />
      {rows.length === 0 ? (
        <Empty className="mt-6 bg-card">
          <EmptyHeader>
            <EmptyTitle>{t("history.emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("history.emptyBody")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // One inset grouped list per day, as in Settings: the day is the group's header, the changes are rows.
        <div className="mt-6 flex flex-col gap-6">
          {groupByDay(rows, dayOf).map(({ day, items }) => (
            <section key={day}>
              <h2 className="px-4 pb-1.5 text-[13px] text-muted-foreground">{day}</h2>
              <ol className="divide-y divide-border/70 overflow-hidden rounded-xl bg-card">
                {items.map((r) => {
                  const fields =
                    r.action === "update" && r.entity === "person" && r.diff && typeof r.diff === "object"
                      ? Object.keys(r.diff as object).map((k) => (FIELDS.has(k) ? t(`history.fields.${k}`) : k))
                      : [];
                  // A change about someone still in the tree opens them: the whole row, with a chevron.
                  const opens = r.entity === "person" && r.entityId && existing.has(r.entityId);
                  return (
                    <li
                      key={r.id}
                      className={cn(
                        "relative flex min-h-12 items-center gap-3 px-4 py-3",
                        opens && "transition-colors duration-150 hover:bg-muted/50 has-[a:active]:bg-muted has-[a:active]:duration-0 has-[a:focus-visible]:bg-accent/40",
                      )}
                    >
                      <div className="min-w-0 flex-1 text-[15px]">
                        <p>
                          <span className="font-medium">{r.userName ?? t("history.deletedMember")}</span>{" "}
                          {opens ? (
                            <Link href={`/trees/${treeId}/people/${r.entityId}`} className="outline-none after:absolute after:inset-0 after:content-['']">
                              {lowerFirst(summaryOf(r.summary))}
                            </Link>
                          ) : (
                            lowerFirst(summaryOf(r.summary))
                          )}
                        </p>
                        {fields.length ? <p className="mt-0.5 text-[13px] text-muted-foreground">{t("history.fieldsLabel", { fields: fields.join(", ") })}</p> : null}
                      </div>
                      <time className="shrink-0 text-[13px] text-muted-foreground tabular-nums" dateTime={r.createdAt.toISOString()}>
                        {timeOf(r.createdAt)}
                      </time>
                      {opens ? <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden /> : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
      {hasMore ? (
        <div className="mt-6 text-center">
          <Link href={`/trees/${treeId}/history?before=${encodeURIComponent(rows.at(-1)!.createdAt.toISOString())}`} className={toolbarAction}>
            {t("history.older")}
          </Link>
        </div>
      ) : null}
    </Page>
  );
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function groupByDay<T extends { createdAt: Date }>(rows: T[], dayOf: (d: Date) => string): { day: string; items: T[] }[] {
  const groups: { day: string; items: T[] }[] = [];
  for (const r of rows) {
    const day = dayOf(r.createdAt);
    if (groups.at(-1)?.day === day) groups.at(-1)!.items.push(r);
    else groups.push({ day, items: [r] });
  }
  return groups;
}
