import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { NewPersonForm } from "@/components/new-person-form";
import { Page } from "@/components/page-shell";
import { loadTreeContext } from "@/lib/tree/context";
import { familyOf } from "@/lib/tree/family";
import type { ChildRelation } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[locale]/trees/[treeId]/people/new">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "person.meta" });
  return { title: t("add") };
}

export default async function NewPersonPage({ params, searchParams }: PageProps<"/[locale]/trees/[treeId]/people/new">) {
  const { treeId } = await params;
  const sp = await searchParams;
  const t = await getTranslations("person");
  const { data, canEdit } = await loadTreeContext(treeId);
  if (!canEdit) notFound();

  const relRaw = typeof sp.rel === "string" ? sp.rel : "";
  const rel = (["parent", "partner", "child", "sibling"] as const).find((r) => r === relRaw);
  const of = typeof sp.from === "string" ? data.persons.find((p) => p.id === sp.from) : undefined;
  const relation = rel && of ? rel : null;
  const unionsOfOf = of ? familyOf(data, of.id).own : [];
  const unionParam = typeof sp.union === "string" ? sp.union : null;
  const base = `/trees/${treeId}`;
  const returnTo = typeof sp.back === "string" && (sp.back === base || sp.back.startsWith(`${base}?`)) ? sp.back : null;
  const childRel = (["biological", "adopted", "step"] as const).find((r) => r === sp.child_relation) as ChildRelation | undefined;

  return (
    <Page className="pt-4">
      <NewPersonForm
        treeId={treeId}
        relation={relation}
        ofId={of?.id ?? null}
        ofName={of?.fullName ?? null}
        unions={unionsOfOf.map((u) => ({ id: u.union.id, label: u.partner ? u.partner.fullName : null }))}
        defaultUnionId={unionParam && unionsOfOf.some((u) => u.union.id === unionParam) ? unionParam : (unionsOfOf[0]?.union.id ?? "")}
        defaultChildRelation={childRel ?? "biological"}
        returnTo={returnTo}
        title={relation && of ? t(`relation.addTitle.${relation}`, { name: of.nickname || of.fullName.split(" ")[0] }) : t("meta.add")}
        cancelHref={returnTo ?? (of ? `/trees/${treeId}/people/${of.id}` : `/trees/${treeId}/list`)}
        note={relation ? undefined : t("new.unconnectedNote")}
        candidates={data.persons
          .filter((p) => p.id !== of?.id)
          .map((p) => ({ id: p.id, name: p.fullName, nickname: p.nickname, birthYear: p.birthDate && p.birthPrecision !== "unknown" ? p.birthDate.slice(0, 4) : null }))}
      />
    </Page>
  );
}
