"use client";

import { PersonFields } from "@/components/person-fields";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTreeAction } from "@/lib/actions";

export function NewTreeForm() {
  const [state, onSubmit, pending] = useFormAction(createTreeAction);
  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-8">
      <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="text-sm font-semibold tracking-wide text-soga-ink uppercase">Tentang pohon</h2>
        <div className="space-y-1.5">
          <Label htmlFor="treeName">Nama pohon</Label>
          <Input id="treeName" name="treeName" required maxLength={120} placeholder='mis. "Bani H. Abdullah" atau "Keluarga Besar Sukardi"' />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="treeDescription">Deskripsi (opsional)</Label>
          <Textarea id="treeDescription" name="treeDescription" rows={2} maxLength={1000} placeholder="Asal daerah, catatan untuk anggota keluarga, dsb." />
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-soga-ink uppercase">Orang pertama</h2>
          <p className="mt-1 text-sm text-muted-foreground">Biasanya leluhur tertua. Orang ini menjadi pusat bagan secara bawaan.</p>
        </div>
        <PersonFields idPrefix="first" />
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-muted/60 p-3 text-sm">
          <input type="checkbox" name="isMe" className="mt-0.5 size-4 accent-[var(--soga)]" />
          <span>
            <span className="font-medium">Orang ini adalah saya</span>
            <span className="block text-muted-foreground">Bisa diatur nanti dari profil siapa pun di pohon.</span>
          </span>
        </label>
      </section>

      {state && !state.ok ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="sticky bottom-[env(safe-area-inset-bottom)] z-20 -mx-4 flex justify-end gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button type="submit" size="lg" className="h-11 px-6" disabled={pending}>
          {pending ? "Membuat…" : "Buat pohon"}
        </Button>
      </div>
    </form>
  );
}
