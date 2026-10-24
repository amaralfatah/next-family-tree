import { notFound } from "next/navigation";
import { EditPersonForm } from "@/components/edit-person-form";
import { Page } from "@/components/page-shell";
import { loadTreeContext } from "@/lib/tree/context";

export const metadata = { title: "Ubah data" };

export default async function EditPersonPage({ params }: PageProps<"/pohon/[treeId]/orang/[personId]/ubah">) {
  const { treeId, personId } = await params;
  const { data, canEdit } = await loadTreeContext(treeId);
  const person = data.persons.find((p) => p.id === personId);
  if (!person || !canEdit) notFound();
  return (
    <Page className="pt-4">
      <EditPersonForm treeId={treeId} person={person} />
    </Page>
  );
}
