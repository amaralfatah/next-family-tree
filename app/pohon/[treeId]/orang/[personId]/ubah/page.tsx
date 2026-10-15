import Link from "next/link";
import { notFound } from "next/navigation";
import { EditPersonForm } from "@/components/edit-person-form";
import { loadTreeContext } from "@/lib/tree/context";

export const metadata = { title: "Ubah data" };

export default async function EditPersonPage({ params }: PageProps<"/pohon/[treeId]/orang/[personId]/ubah">) {
  const { treeId, personId } = await params;
  const { data, canEdit } = await loadTreeContext(treeId);
  const person = data.persons.find((p) => p.id === personId);
  if (!person || !canEdit) notFound();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href={`/pohon/${treeId}/orang/${personId}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← {person.fullName}
      </Link>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Ubah data</h1>
      <EditPersonForm treeId={treeId} person={person} />
    </main>
  );
}
