import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { EditPersonForm } from "@/components/edit-person-form";
import { Page } from "@/components/page-shell";
import { loadTreeContext } from "@/lib/tree/context";

export async function generateMetadata({ params }: PageProps<"/[locale]/trees/[treeId]/people/[personId]/edit">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "person.meta" });
  return { title: t("edit") };
}

export default async function EditPersonPage({ params }: PageProps<"/[locale]/trees/[treeId]/people/[personId]/edit">) {
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
