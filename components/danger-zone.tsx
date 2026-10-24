"use client";

import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { FormGroup } from "@/components/form-rows";
import { Input } from "@/components/ui/input";
import { deleteTreeAction, leaveTreeAction } from "@/lib/actions";

/** The irreversible actions: one red row in its own group at the end of Settings, each asking first. */
export function DangerZone({ treeId, treeName, isOwner }: { treeId: string; treeName: string; isOwner: boolean }) {
  const [typed, setTyped] = useState("");
  return (
    <section>
      {isOwner ? (
        <FormGroup footer="Pemilik tidak bisa keluar dari pohon. Serahkan kepemilikan di halaman Anggota, atau hapus pohon beserta semua data dan fotonya secara permanen.">
          <ConfirmButton
            row
            label="Hapus pohon permanen"
            title={`Hapus “${treeName}” selamanya?`}
            description="Semua orang, relasi, foto, undangan, dan riwayat dihapus dan tidak bisa dikembalikan."
            confirmLabel="Hapus permanen"
            confirmDisabled={typed.trim() !== treeName}
            onConfirm={() => deleteTreeAction(treeId, typed)}
          >
            {/* An alert's text field, as in iOS: a plain field under the message, no group inside the alert. */}
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">
                Ketik <strong className="font-semibold text-foreground">{treeName}</strong> untuk mengonfirmasi.
              </span>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} placeholder={treeName} />
            </label>
          </ConfirmButton>
        </FormGroup>
      ) : (
        <FormGroup footer="Data yang Anda isi tetap ada. Anda perlu link undangan baru untuk bergabung lagi.">
          <ConfirmButton
            row
            label="Keluar dari pohon"
            title="Keluar dari pohon ini?"
            description="Anda tidak akan bisa membuka pohon ini lagi tanpa undangan baru."
            confirmLabel="Keluar"
            onConfirm={() => leaveTreeAction(treeId)}
          />
        </FormGroup>
      )}
    </section>
  );
}
