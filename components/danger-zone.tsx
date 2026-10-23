"use client";

import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { deleteTreeAction, leaveTreeAction } from "@/lib/actions";

export function DangerZone({ treeId, treeName, isOwner }: { treeId: string; treeName: string; isOwner: boolean }) {
  const [typed, setTyped] = useState("");
  return (
    <section className="rounded-xl border border-destructive/30 p-5">
      <h2 className="text-lg font-semibold tracking-[-0.01em] text-destructive">Zona berbahaya</h2>
      {isOwner ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Pemilik tidak bisa keluar dari pohon. Serahkan kepemilikan di halaman Anggota, atau hapus pohon beserta semua data dan fotonya secara
            permanen.
          </p>
          <div className="mt-4">
            <ConfirmButton
              label="Hapus pohon permanen"
              title={`Hapus “${treeName}” selamanya?`}
              description="Semua orang, relasi, foto, undangan, dan riwayat dihapus dan tidak bisa dikembalikan."
              confirmLabel="Hapus permanen"
              onConfirm={async () => {
                if (typed.trim() !== treeName) return { ok: false, error: "Ketik nama pohon persis untuk mengonfirmasi." };
                return deleteTreeAction(treeId, typed);
              }}
            >
              <Field>
                <FieldLabel htmlFor="confirm-name">
                  Ketik <strong>{treeName}</strong> untuk mengonfirmasi
                </FieldLabel>
                <Input id="confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
              </Field>
            </ConfirmButton>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">Keluar dari pohon ini. Data yang Anda isi tetap ada. Anda perlu link undangan baru untuk bergabung lagi.</p>
          <div className="mt-4">
            <ConfirmButton
              label="Keluar dari pohon"
              title="Keluar dari pohon ini?"
              description="Anda tidak akan bisa membuka pohon ini lagi tanpa undangan baru."
              confirmLabel="Keluar"
              onConfirm={() => leaveTreeAction(treeId)}
            />
          </div>
        </>
      )}
    </section>
  );
}
