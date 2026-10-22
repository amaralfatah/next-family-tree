"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateTreeAction } from "@/lib/actions";
import { useFormAction } from "@/lib/use-form-action";

export function TreeInfoForm({ treeId, name, description }: { treeId: string; name: string; description: string | null }) {
  const [state, onSubmit, pending] = useFormAction(updateTreeAction.bind(null, treeId));
  useEffect(() => {
    if (state?.ok) toast.success("Info pohon disimpan.");
  }, [state]);
  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-4 rounded-xl bg-card p-5">
      <Field>
        <FieldLabel htmlFor="s-name">Nama pohon</FieldLabel>
        <Input id="s-name" name="treeName" defaultValue={name} required maxLength={120} autoComplete="off" />
      </Field>
      <Field>
        <FieldLabel htmlFor="s-desc">Deskripsi</FieldLabel>
        <Textarea id="s-desc" name="treeDescription" defaultValue={description ?? ""} rows={3} maxLength={1000} />
      </Field>
      {state && !state.ok ? <FieldError>{state.error}</FieldError> : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
