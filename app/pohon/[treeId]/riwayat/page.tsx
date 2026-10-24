import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { toolbarAction } from "@/components/form-row-classes";
import { Page, PageTitle } from "@/components/page-shell";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { loadTreeContext } from "@/lib/tree/context";
import { listChangesWith } from "@/lib/tree/service";

export const metadata = { title: "Riwayat" };

const FIELD_LABEL: Record<string, string> = {
  fullName: "nama",
  nickname: "panggilan",
  gender: "jenis kelamin",
  birthDate: "tanggal lahir",
  birthPrecision: "ketepatan tanggal lahir",
  birthPlace: "tempat lahir",
  isLiving: "status hidup",
  deathDate: "tanggal wafat",
  deathPrecision: "ketepatan tanggal wafat",
  notes: "catatan",
};

const timeFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const dayFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" });

export default async function HistoryPage({ params, searchParams }: PageProps<"/pohon/[treeId]/riwayat">) {
  const { treeId } = await params;
  const sp = await searchParams;
  const { db, access, data } = await loadTreeContext(treeId);
  const before = typeof sp.sebelum === "string" && !Number.isNaN(Date.parse(sp.sebelum)) ? new Date(sp.sebelum) : undefined;
  const { rows, hasMore } = await listChangesWith(db, access, { before, limit: 50 });
  const existing = new Set(data.persons.map((p) => p.id));

  return (
    <Page>
      <PageTitle title="Riwayat perubahan" subtitle="Siapa mengubah apa, dan kapan. Waktu dalam WIB." />
      {rows.length === 0 ? (
        <Empty className="mt-6 bg-card">
          <EmptyHeader>
            <EmptyTitle>Belum ada perubahan</EmptyTitle>
            <EmptyDescription>Setiap tambahan, ubahan, dan penghapusan oleh anggota tercatat di sini.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // One inset grouped list per day, as in Settings: the day is the group's header, the changes are rows.
        <div className="mt-6 flex flex-col gap-6">
          {groupByDay(rows).map(({ day, items }) => (
            <section key={day}>
              <h2 className="px-4 pb-1.5 text-[13px] text-muted-foreground">{day}</h2>
              <ol className="divide-y divide-border/70 overflow-hidden rounded-xl bg-card">
                {items.map((r) => {
                  const fields =
                    r.action === "update" && r.entity === "person" && r.diff && typeof r.diff === "object"
                      ? Object.keys(r.diff as object).map((k) => FIELD_LABEL[k] ?? k)
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
                          <span className="font-medium">{r.userName ?? "Anggota terhapus"}</span>{" "}
                          {opens ? (
                            <Link href={`/pohon/${treeId}/orang/${r.entityId}`} className="outline-none after:absolute after:inset-0 after:content-['']">
                              {lowerFirst(r.summary)}
                            </Link>
                          ) : (
                            lowerFirst(r.summary)
                          )}
                        </p>
                        {fields.length ? <p className="mt-0.5 text-[13px] text-muted-foreground">Bagian: {fields.join(", ")}</p> : null}
                      </div>
                      <time className="shrink-0 text-[13px] text-muted-foreground tabular-nums" dateTime={r.createdAt.toISOString()}>
                        {timeFmt.format(r.createdAt).split(", ").pop()}
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
          <Link href={`/pohon/${treeId}/riwayat?sebelum=${encodeURIComponent(rows.at(-1)!.createdAt.toISOString())}`} className={toolbarAction}>
            Tampilkan yang lebih lama
          </Link>
        </div>
      ) : null}
    </Page>
  );
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function groupByDay<T extends { createdAt: Date }>(rows: T[]): { day: string; items: T[] }[] {
  const groups: { day: string; items: T[] }[] = [];
  for (const r of rows) {
    const day = dayFmt.format(r.createdAt);
    if (groups.at(-1)?.day === day) groups.at(-1)!.items.push(r);
    else groups.push({ day, items: [r] });
  }
  return groups;
}
