import Link from "next/link";
import { notFound } from "next/navigation";
import { NewPersonForm } from "@/components/new-person-form";
import { loadTreeContext } from "@/lib/tree/context";
import { familyOf } from "@/lib/tree/family";
import type { ChildRelation } from "@/lib/types";

export const metadata = { title: "Tambah orang" };

const TITLES = {
  parent: (n: string) => `Tambah orang tua ${n}`,
  partner: (n: string) => `Tambah pasangan ${n}`,
  child: (n: string) => `Tambah anak ${n}`,
  sibling: (n: string) => `Tambah saudara ${n}`,
} as const;

export default async function NewPersonPage({ params, searchParams }: PageProps<"/pohon/[treeId]/orang/baru">) {
  const { treeId } = await params;
  const sp = await searchParams;
  const { data, canEdit } = await loadTreeContext(treeId);
  if (!canEdit) notFound();

  const relRaw = typeof sp.rel === "string" ? sp.rel : "";
  const rel = (["parent", "partner", "child", "sibling"] as const).find((r) => r === relRaw);
  const of = typeof sp.dari === "string" ? data.persons.find((p) => p.id === sp.dari) : undefined;
  const relation = rel && of ? rel : null;
  const unionsOfOf = of ? familyOf(data, of.id).own : [];
  const unionParam = typeof sp.ikatan === "string" ? sp.ikatan : null;
  const childRel = (["biological", "adopted", "step"] as const).find((r) => r === sp.rel_anak) as ChildRelation | undefined;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      {of ? (
        <Link href={`/pohon/${treeId}/orang/${of.id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {of.fullName}
        </Link>
      ) : null}
      <h1 className="mt-2 font-display text-4xl tracking-tight">{relation && of ? TITLES[relation](of.fullName) : "Tambah orang"}</h1>
      {!relation ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Orang ini belum terhubung dengan siapa pun. Sebaiknya tambahkan dari profil kerabatnya agar langsung tersambung di bagan.
        </p>
      ) : null}
      <NewPersonForm
        treeId={treeId}
        relation={relation}
        ofId={of?.id ?? null}
        ofName={of?.fullName ?? null}
        unions={unionsOfOf.map((u) => ({ id: u.union.id, label: u.partner ? `Dengan ${u.partner.fullName}` : "Pasangan tidak diketahui" }))}
        defaultUnionId={unionParam && unionsOfOf.some((u) => u.union.id === unionParam) ? unionParam : (unionsOfOf[0]?.union.id ?? "")}
        defaultChildRelation={childRel ?? "biological"}
        candidates={data.persons
          .filter((p) => p.id !== of?.id)
          .map((p) => ({ id: p.id, name: p.fullName, nickname: p.nickname, birthYear: p.birthDate && p.birthPrecision !== "unknown" ? p.birthDate.slice(0, 4) : null }))}
      />
    </main>
  );
}
