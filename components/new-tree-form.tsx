"use client";

import { FormBar, FormGroup, FormRow, SwitchRow, rowInput } from "@/components/form-rows";
import { PersonFields } from "@/components/person-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFormAction } from "@/lib/use-form-action";
import { createTreeAction } from "@/lib/actions";

export function NewTreeForm() {
  const [state, onSubmit, pending] = useFormAction(createTreeAction);
  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <FormBar title="Pohon baru" cancelHref="/pohon" submitLabel="Buat" pending={pending} />
      {/* Grouped rows, the same form as adding or editing a person (components/form-rows.tsx). */}
      <section className="grid gap-6">
        <FormGroup title="Tentang pohon">
          <FormRow label="Nama pohon" htmlFor="treeName">
            <input id="treeName" name="treeName" required maxLength={120} autoComplete="off" placeholder="mis. Bani H. Abdullah" className={rowInput} />
          </FormRow>
        </FormGroup>
        <FormGroup title="Deskripsi (opsional)">
          <textarea
            id="treeDescription"
            name="treeDescription"
            aria-label="Deskripsi"
            rows={2}
            maxLength={1000}
            placeholder="Asal daerah, catatan untuk anggota keluarga…"
            className="block min-h-20 w-full resize-y bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:bg-accent/40"
          />
        </FormGroup>
      </section>

      <section className="grid gap-6">
        <div className="px-4">
          <h2 className="text-[13px] text-muted-foreground">Orang pertama</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Biasanya leluhur tertua. Orang ini tampil di tengah saat pohon dibuka.</p>
        </div>
        <PersonFields idPrefix="first" />
        <FormGroup footer="Bisa diatur nanti dari profil siapa pun di pohon.">
          <SwitchRow label="Orang ini adalah saya" id="isMe" name="isMe" value="on" />
        </FormGroup>
      </section>

      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
