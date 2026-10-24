"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { FormGroup, FormRow, actionRow, rowInput } from "@/components/form-rows";
import { updateTreeAction } from "@/lib/actions";
import { useFormAction } from "@/lib/use-form-action";

export function TreeInfoForm({ treeId, name, description }: { treeId: string; name: string; description: string | null }) {
  const [state, onSubmit, pending] = useFormAction(updateTreeAction.bind(null, treeId));
  useEffect(() => {
    if (state?.ok) toast.success("Info pohon disimpan.");
  }, [state]);
  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <FormGroup title="Info pohon" footer={state && !state.ok ? <span className="text-destructive">{state.error}</span> : undefined}>
        <FormRow label="Nama pohon" htmlFor="s-name">
          <input id="s-name" name="treeName" defaultValue={name} required maxLength={120} autoComplete="off" placeholder="Wajib diisi" className={rowInput} />
        </FormRow>
      </FormGroup>
      <FormGroup title="Deskripsi">
        <textarea
          id="s-desc"
          name="treeDescription"
          aria-label="Deskripsi"
          defaultValue={description ?? ""}
          rows={3}
          maxLength={1000}
          placeholder="Asal daerah, catatan untuk anggota keluarga…"
          className="block min-h-20 w-full resize-y bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:bg-accent/40"
        />
      </FormGroup>
      <FormGroup>
        <button type="submit" disabled={pending} className={actionRow}>
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
      </FormGroup>
    </form>
  );
}
