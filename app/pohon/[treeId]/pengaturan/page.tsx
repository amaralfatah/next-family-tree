import { DownloadIcon } from "lucide-react";
import { DangerZone } from "@/components/danger-zone";
import { TreeInfoForm } from "@/components/tree-info-form";
import { buttonVariants } from "@/components/ui/button";
import { loadTreeMeta } from "@/lib/tree/context";
import { countTreeContents } from "@/lib/tree/service";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage({ params }: PageProps<"/pohon/[treeId]/pengaturan">) {
  const { treeId } = await params;
  const { db, tree, canEdit, isOwner } = await loadTreeMeta(treeId);
  const counts = await countTreeContents(db, treeId);
  return (
    <main id="konten" className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8">
      <div>
        <h1 className="font-display text-[2.125rem] leading-tight tracking-[-0.02em]">Pengaturan</h1>
      </div>

      {canEdit ? (
        <section>
          <h2 className="font-display text-2xl">Info pohon</h2>
          <TreeInfoForm treeId={treeId} name={tree.name} description={tree.description} />
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-2xl">Cadangan data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Unduh seluruh isi pohon ({counts.persons} orang, {counts.unions} ikatan) sebagai JSON. Simpan di tempat aman: berkas ini berisi data
          pribadi keluarga.
        </p>
        <a href={`/pohon/${treeId}/ekspor`} className={buttonVariants({ variant: "outline", className: "mt-3" })}>
          <DownloadIcon data-icon="inline-start" /> Unduh JSON
        </a>
        <p className="mt-3 text-sm text-muted-foreground">Untuk mencetak bagan (PNG, SVG, atau PDF ukuran A4 sampai A1), gunakan tombol Ekspor di halaman Bagan.</p>
      </section>

      <DangerZone treeId={treeId} treeName={tree.name} isOwner={isOwner} />
    </main>
  );
}
