import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { LinkMeButton } from "@/components/link-me-button";
import { PersonAvatar } from "@/components/person-avatar";
import { buttonVariants } from "@/components/ui/button";
import { generations } from "@/lib/graph/build";
import { describeKinship } from "@/lib/kinship";
import { subtitle } from "@/lib/person";
import { loadTreeContext } from "@/lib/tree/context";

export const metadata = { title: "Daftar" };

const PAGE = 50;

export default async function ListPage({ params, searchParams }: PageProps<"/pohon/[treeId]/daftar">) {
  const { treeId } = await params;
  const sp = await searchParams;
  const { tree, data, mePersonId, canEdit } = await loadTreeContext(treeId);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const gen = typeof sp.gen === "string" && sp.gen !== "" ? Number(sp.gen) : null;
  const page = Math.max(1, Number(sp.hal) || 1);
  const findMe = sp["cari-saya"] === "1" && !mePersonId;

  const root = tree.rootPersonId ?? data.persons[0]?.id;
  const genOf = root ? generations(data, root) : new Map<string, number>();
  const genValues = [...new Set(genOf.values())].sort((a, b) => a - b);

  const needle = q.toLowerCase();
  const filtered = data.persons
    .filter((p) => !needle || p.fullName.toLowerCase().includes(needle) || p.nickname?.toLowerCase().includes(needle) || p.birthPlace?.toLowerCase().includes(needle))
    .filter((p) => gen === null || genOf.get(p.id) === gen)
    .sort((a, b) => (genOf.get(a.id) ?? 99) - (genOf.get(b.id) ?? 99) || a.fullName.localeCompare(b.fullName, "id"));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);

  const href = (over: Record<string, string | number | null>) => {
    const u = new URLSearchParams();
    const merged = { q: q || null, gen: gen ?? null, hal: page > 1 ? page : null, "cari-saya": findMe ? "1" : null, ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== null && v !== "") u.set(k, String(v));
    const s = u.toString();
    return `/pohon/${treeId}/daftar${s ? `?${s}` : ""}`;
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Daftar keluarga</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.persons.length} orang tercatat · generasi dihitung dari pusat bawaan bagan</p>
        </div>
        {canEdit ? (
          <Link href={`/pohon/${treeId}/orang/baru`} className={buttonVariants({ variant: "outline" })}>
            <PlusIcon data-icon="inline-start" /> Orang tanpa relasi
          </Link>
        ) : null}
      </div>

      {findMe ? (
        <div className="mt-6 rounded-xl border border-soga/40 bg-accent/50 p-4 text-sm">
          <p className="font-medium">Cari nama Anda, lalu pilih &ldquo;Ini saya&rdquo;.</p>
          <p className="mt-1 text-muted-foreground">Belum tercatat? Minta editor menambahkan Anda, atau tambahkan sendiri bila Anda editor.</p>
        </div>
      ) : null}

      <form className="mt-6 flex flex-wrap gap-2" action={`/pohon/${treeId}/daftar`}>
        {findMe ? <input type="hidden" name="cari-saya" value="1" /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nama, panggilan, atau tempat lahir"
          aria-label="Cari"
          autoFocus={findMe}
          className="h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-9 sm:w-auto sm:max-w-sm sm:flex-1 md:text-sm dark:bg-input/30"
        />
        <select name="gen" defaultValue={gen ?? ""} aria-label="Filter generasi" className="field !h-10 min-w-0 flex-1 sm:!h-9 sm:!w-auto sm:flex-none">
          <option value="">Semua generasi</option>
          {genValues.map((g) => (
            <option key={g} value={g}>
              Generasi {g}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonVariants({ variant: "secondary", className: "h-10 sm:h-9" })}>
          Terapkan
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">Tidak ada yang cocok dengan pencarian.</p>
      ) : (
        <ul className="mt-6 divide-y overflow-hidden rounded-xl border bg-card">
          {rows.map((p) => {
            const kin = mePersonId && p.id !== mePersonId ? describeKinship(data, mePersonId, p.id) : null;
            return (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <PersonAvatar treeId={treeId} person={p} size="sm" />
                <Link href={`/pohon/${treeId}/orang/${p.id}`} className="min-w-0 flex-1 outline-none focus-visible:underline">
                  <span className="block truncate font-medium">
                    {p.fullName}
                    {p.nickname ? <span className="font-normal text-muted-foreground"> “{p.nickname}”</span> : null}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[subtitle(p), p.birthPlace].filter(Boolean).join(" · ") || "—"}
                  </span>
                </Link>
                <span className="hidden shrink-0 text-right text-sm sm:block">
                  {p.id === mePersonId ? (
                    <span className="font-medium text-soga-ink">Saya</span>
                  ) : kin ? (
                    <span className="text-soga-ink">{kin.label}</span>
                  ) : null}
                  {genOf.has(p.id) ? <span className="block text-xs text-muted-foreground">Generasi {genOf.get(p.id)}</span> : null}
                </span>
                {findMe ? <LinkMeButton treeId={treeId} personId={p.id} /> : null}
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Halaman" className="mt-6 flex items-center justify-center gap-2 text-sm">
          {page > 1 ? (
            <Link href={href({ hal: page - 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Sebelumnya
            </Link>
          ) : null}
          <span className="px-2 text-muted-foreground">
            Halaman {page} dari {pages}
          </span>
          {page < pages ? (
            <Link href={href({ hal: page + 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Berikutnya
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
