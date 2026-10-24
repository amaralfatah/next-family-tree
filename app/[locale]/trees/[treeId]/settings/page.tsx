import { getTranslations } from "next-intl/server";
import { DangerZone } from "@/components/danger-zone";
import { Page, PageTitle } from "@/components/page-shell";
import { RootPersonForm } from "@/components/root-person-form";
import { TreeInfoForm } from "@/components/tree-info-form";
import { loadTreeContext } from "@/lib/tree/context";

export async function generateMetadata({ params }: PageProps<"/[locale]/trees/[treeId]/settings">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "trees" });
  return { title: t("settings.metaTitle") };
}

export default async function SettingsPage({ params }: PageProps<"/[locale]/trees/[treeId]/settings">) {
  const { locale, treeId } = await params;
  const t = await getTranslations("trees");
  const { tree, data, canEdit, isOwner } = await loadTreeContext(treeId);
  return (
    <Page className="grid gap-8">
      <PageTitle title={t("settings.title")} />

      {canEdit ? <TreeInfoForm treeId={treeId} name={tree.name} description={tree.description} /> : null}

      {canEdit && data.persons.length > 0 ? (
        <RootPersonForm
          treeId={treeId}
          rootPersonId={tree.rootPersonId}
          persons={data.persons
            // Same-named relatives are common; the birth year tells them apart in the list.
            .map((p) => ({ id: p.id, fullName: p.birthDate && p.birthPrecision !== "unknown" ? t("settings.bornLabel", { name: p.fullName, year: p.birthDate.slice(0, 4) }) : p.fullName }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName, locale))}
        />
      ) : null}

      <DangerZone treeId={treeId} treeName={tree.name} isOwner={isOwner} />
    </Page>
  );
}
