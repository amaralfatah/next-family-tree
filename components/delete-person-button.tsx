"use client";

import { Trash2Icon } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { FormGroup } from "@/components/form-rows";
import { deletePersonAction } from "@/lib/actions";

/** The profile's last group, as in Contacts: one red row that asks before deleting. */
export function DeletePersonButton({ treeId, personId, name }: { treeId: string; personId: string; name: string }) {
  return (
    <FormGroup footer="Anak-anaknya tetap ada dan tetap terhubung dengan orang tua lainnya. Penghapusan tercatat di riwayat.">
      <ConfirmButton
        row
        label={
          <>
            <Trash2Icon className="size-[18px]" /> Hapus
          </>
        }
        title={`Hapus ${name}?`}
        description="Data dan fotonya dihapus. Anak-anaknya tetap ada dan tetap terhubung dengan orang tua lainnya. Penghapusan tercatat di riwayat."
        confirmLabel="Hapus"
        onConfirm={() => deletePersonAction(treeId, personId)}
      />
    </FormGroup>
  );
}
