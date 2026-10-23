import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { LinkMeButton } from "@/components/link-me-button";
import { PersonAvatar } from "@/components/person-avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { generations } from "@/lib/graph/build";
import { createKinshipResolver } from "@/lib/kinship";
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

  const kinOf = mePersonId ? createKinshipResolver(data, mePersonId) : null;
  return (
    <main id="konten" className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2.125rem] leading-tight tracking-[-0.02em]">Daftar keluarga</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.persons.length} orang tercatat · generasi dihitung dari pusat bawaan pohon</p>
        </div>
        {canEdit ? (
          <Link href={`/pohon/${treeId}/orang/baru`} className={buttonVariants({ variant: "outline" })}>
            <PlusIcon data-icon="inline-start" /> Orang tanpa relasi
          </Link>
        ) : null}
      </div>

      {findMe ? (
        <Alert className="mt-6">
          <AlertTitle>Cari nama Anda, lalu pilih &ldquo;Ini saya&rdquo;.</AlertTitle>
          <AlertDescription>Belum tercatat? Minta editor menambahkan Anda, atau tambahkan sendiri bila Anda editor.</AlertDescription>
        </Alert>
      ) : null}

      <form className="mt-6 flex flex-wrap gap-2" action={`/pohon/${treeId}/daftar`}>
        {findMe ? <input type="hidden" name="cari-saya" value="1" /> : null}
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Cari nama, panggilan, atau tempat lahir…"
          aria-label="Cari"
          autoComplete="off"
          // Arrives from "Cari saya": the search is the only thing to do on this page.
          autoFocus={findMe}
          className="w-full sm:w-auto sm:max-w-sm sm:flex-1"
        />
        <NativeSelect name="gen" defaultValue={gen ?? ""} aria-label="Filter generasi" className="min-w-0 flex-1 sm:flex-none">
          <NativeSelectOption value="">Semua generasi</NativeSelectOption>
          {genValues.map((g) => (
            <NativeSelectOption key={g} value={g}>
              Generasi {g}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Terapkan
        </Button>
      </form>

      {rows.length === 0 ? (
        <Empty className="mt-6 border">
          <EmptyHeader>
            <EmptyTitle>Tidak ada yang cocok</EmptyTitle>
            <EmptyDescription>Coba nama lain, atau hapus filter generasi.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="mt-6 divide-y overflow-hidden rounded-xl bg-card">
          {rows.map((p) => {
            const kin = kinOf && p.id !== mePersonId ? kinOf(p.id) : null;
            return (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <PersonAvatar treeId={treeId} person={p} size="sm" />
                <Link href={`/pohon/${treeId}/orang/${p.id}`} className="min-w-0 flex-1 rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                  <span className="block truncate font-medium">
                    {p.fullName}
                    {p.nickname ? <span className="font-normal text-muted-foreground"> “{p.nickname}”</span> : null}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[subtitle(p), p.birthPlace].filter(Boolean).join(" · ") || "—"}
                  </span>
                  {/* Phones: the relation column is hidden, so the kinship term joins the name instead. */}
                  {p.id === mePersonId ? (
                    <span className="block text-sm font-medium text-soga-ink sm:hidden">Saya</span>
                  ) : kin ? (
                    <span className="block truncate text-sm text-soga-ink sm:hidden">{kin.label}</span>
                  ) : null}
                </Link>
                <span className="hidden shrink-0 text-right text-sm sm:block">
                  {p.id === mePersonId ? (
                    <span className="font-medium text-soga-ink">Saya</span>
                  ) : kin ? (
                    <span className="text-soga-ink">{kin.label}</span>
                  ) : null}
                  {genOf.has(p.id) ? <span className="block text-xs text-muted-foreground tabular-nums">Generasi {genOf.get(p.id)}</span> : null}
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
          <span className="px-2 text-muted-foreground tabular-nums">
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
