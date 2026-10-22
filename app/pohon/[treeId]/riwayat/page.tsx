import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
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
    <main id="konten" className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-display text-[2.125rem] leading-tight tracking-[-0.02em]">Riwayat perubahan</h1>
      <p className="mt-1 text-sm text-muted-foreground">Siapa mengubah apa, dan kapan. Waktu dalam WIB.</p>
      {rows.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Belum ada perubahan.</p>
      ) : (
        <ol className="mt-6 flex flex-col gap-1">
          {rows.map((r, i) => {
            const day = dayFmt.format(r.createdAt);
            const header = i === 0 || dayFmt.format(rows[i - 1].createdAt) !== day;
            const fields =
              r.action === "update" && r.entity === "person" && r.diff && typeof r.diff === "object"
                ? Object.keys(r.diff as object).map((k) => FIELD_LABEL[k] ?? k)
                : [];
            return (
              <li key={r.id}>
                {header ? <h2 className="pt-6 pb-2 text-sm font-semibold text-muted-foreground">{day}</h2> : null}
                <div className="flex gap-3 rounded-lg px-3 py-2 hover:bg-muted/60">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-nila" aria-hidden />
                  <div className="min-w-0 flex-1 text-sm">
                    <p>
                      <span className="font-medium">{r.userName ?? "Anggota terhapus"}</span>{" "}
                      {r.entity === "person" && r.entityId && existing.has(r.entityId) ? (
                        <Link href={`/pohon/${treeId}/orang/${r.entityId}`} className="underline-offset-2 hover:underline">
                          {lowerFirst(r.summary)}
                        </Link>
                      ) : (
                        lowerFirst(r.summary)
                      )}
                    </p>
                    {fields.length ? <p className="text-xs text-muted-foreground">Bagian: {fields.join(", ")}</p> : null}
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground tabular-nums" dateTime={r.createdAt.toISOString()}>
                    {timeFmt.format(r.createdAt).split(", ").pop()}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {hasMore ? (
        <div className="mt-6 text-center">
          <Link href={`/pohon/${treeId}/riwayat?sebelum=${encodeURIComponent(rows.at(-1)!.createdAt.toISOString())}`} className={buttonVariants({ variant: "outline" })}>
            Lebih lama
          </Link>
        </div>
      ) : null}
    </main>
  );
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
