"use client";

import { Trash2Icon } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { deletePersonAction } from "@/lib/actions";

export function DeletePersonButton({ treeId, personId, name }: { treeId: string; personId: string; name: string }) {
  return (
    <ConfirmButton
      label={
        <>
          <Trash2Icon data-icon="inline-start" /> Hapus orang ini
        </>
      }
      title={`Hapus ${name}?`}
      description="Data dan fotonya dihapus. Anak-anaknya tetap ada dan tetap terhubung dengan orang tua lainnya. Penghapusan tercatat di riwayat."
      confirmLabel="Hapus"
      onConfirm={() => deletePersonAction(treeId, personId)}
    />
  );
}
