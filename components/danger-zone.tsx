"use client";

import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteTreeAction, leaveTreeAction } from "@/lib/actions";

export function DangerZone({ treeId, treeName, isOwner }: { treeId: string; treeName: string; isOwner: boolean }) {
  const [typed, setTyped] = useState("");
  return (
    <section className="rounded-xl border border-destructive/30 p-5">
      <h2 className="font-display text-2xl text-destructive">Zona berbahaya</h2>
      {isOwner ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Pemilik tidak bisa keluar dari pohon. Serahkan kepemilikan di halaman Anggota, atau hapus pohon beserta semua data dan fotonya secara
            permanen.
          </p>
          <div className="mt-4">
            <ConfirmButton
              label="Hapus pohon permanen"
              title={`Hapus "${treeName}" selamanya?`}
              description="Semua orang, relasi, foto, undangan, dan riwayat dihapus dan tidak bisa dikembalikan. Unduh cadangan JSON dulu bila perlu."
              confirmLabel="Hapus permanen"
              onConfirm={async () => {
                if (typed.trim() !== treeName) return { ok: false, error: "Ketik nama pohon persis untuk mengonfirmasi." };
                return deleteTreeAction(treeId, typed);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="confirm-name">
                  Ketik <strong>{treeName}</strong> untuk mengonfirmasi
                </Label>
                <Input id="confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
              </div>
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
