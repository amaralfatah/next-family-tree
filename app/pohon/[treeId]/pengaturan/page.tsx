import { DangerZone } from "@/components/danger-zone";
import { TreeInfoForm } from "@/components/tree-info-form";
import { loadTreeMeta } from "@/lib/tree/context";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage({ params }: PageProps<"/pohon/[treeId]/pengaturan">) {
  const { treeId } = await params;
  const { tree, canEdit, isOwner } = await loadTreeMeta(treeId);
  return (
    <main id="konten" className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8">
      <div>
        <h1 className="font-display text-[2.125rem] leading-tight tracking-[-0.02em]">Pengaturan</h1>
      </div>

      {canEdit ? (
        <section>
          <h2 className="text-lg font-semibold tracking-[-0.01em]">Info pohon</h2>
          <TreeInfoForm treeId={treeId} name={tree.name} description={tree.description} />
        </section>
      ) : null}

      <DangerZone treeId={treeId} treeName={tree.name} isOwner={isOwner} />
    </main>
  );
}
