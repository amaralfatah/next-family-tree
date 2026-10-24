import { notFound } from "next/navigation";
import { NewPersonForm } from "@/components/new-person-form";
import { Page } from "@/components/page-shell";
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
  const base = `/pohon/${treeId}`;
  const returnTo = typeof sp.kembali === "string" && (sp.kembali === base || sp.kembali.startsWith(`${base}?`)) ? sp.kembali : null;
  const childRel = (["biological", "adopted", "step"] as const).find((r) => r === sp.rel_anak) as ChildRelation | undefined;

  return (
    <Page className="pt-4">
      <NewPersonForm
        treeId={treeId}
        relation={relation}
        ofId={of?.id ?? null}
        ofName={of?.fullName ?? null}
        unions={unionsOfOf.map((u) => ({ id: u.union.id, label: u.partner ? u.partner.fullName : "Tidak diketahui" }))}
        defaultUnionId={unionParam && unionsOfOf.some((u) => u.union.id === unionParam) ? unionParam : (unionsOfOf[0]?.union.id ?? "")}
        defaultChildRelation={childRel ?? "biological"}
        returnTo={returnTo}
        title={relation && of ? TITLES[relation](of.nickname || of.fullName.split(" ")[0]) : "Tambah orang"}
        cancelHref={returnTo ?? (of ? `/pohon/${treeId}/orang/${of.id}` : `/pohon/${treeId}/daftar`)}
        note={relation ? undefined : "Orang ini belum terhubung dengan siapa pun. Sebaiknya tambahkan dari profil kerabatnya agar langsung tersambung di pohon."}
        candidates={data.persons
          .filter((p) => p.id !== of?.id)
          .map((p) => ({ id: p.id, name: p.fullName, nickname: p.nickname, birthYear: p.birthDate && p.birthPrecision !== "unknown" ? p.birthDate.slice(0, 4) : null }))}
      />
    </Page>
  );
}
