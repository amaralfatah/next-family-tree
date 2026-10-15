import { DownloadIcon } from "lucide-react";
import { DangerZone } from "@/components/danger-zone";
import { TreeInfoForm } from "@/components/tree-info-form";
import { buttonVariants } from "@/components/ui/button";
import { loadTreeContext } from "@/lib/tree/context";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage({ params }: PageProps<"/pohon/[treeId]/pengaturan">) {
  const { treeId } = await params;
  const { tree, canEdit, isOwner, data } = await loadTreeContext(treeId);
  return (
    <main className="mx-auto w-full max-w-3xl space-y-10 px-4 py-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Pengaturan</h1>
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
          Unduh seluruh isi pohon ({data.persons.length} orang, {data.unions.length} ikatan) sebagai JSON. Simpan di tempat aman: berkas ini berisi data
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
