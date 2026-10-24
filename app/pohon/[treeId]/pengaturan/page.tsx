import { DangerZone } from "@/components/danger-zone";
import { Page, PageTitle } from "@/components/page-shell";
import { RootPersonForm } from "@/components/root-person-form";
import { TreeInfoForm } from "@/components/tree-info-form";
import { loadTreeContext } from "@/lib/tree/context";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage({ params }: PageProps<"/pohon/[treeId]/pengaturan">) {
  const { treeId } = await params;
  const { tree, data, canEdit, isOwner } = await loadTreeContext(treeId);
  return (
    <Page className="grid gap-8">
      <PageTitle title="Pengaturan" />

      {canEdit ? <TreeInfoForm treeId={treeId} name={tree.name} description={tree.description} /> : null}

      {canEdit && data.persons.length > 0 ? (
        <RootPersonForm
          treeId={treeId}
          rootPersonId={tree.rootPersonId}
          persons={data.persons
            // Same-named relatives are common; the birth year tells them apart in the list.
            .map((p) => ({ id: p.id, fullName: p.birthDate && p.birthPrecision !== "unknown" ? `${p.fullName} (l. ${p.birthDate.slice(0, 4)})` : p.fullName }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName, "id"))}
        />
      ) : null}

      <DangerZone treeId={treeId} treeName={tree.name} isOwner={isOwner} />
    </Page>
  );
}
