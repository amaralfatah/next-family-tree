"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateTreeAction } from "@/lib/actions";
import { useFormAction } from "@/lib/use-form-action";

export function TreeInfoForm({ treeId, name, description }: { treeId: string; name: string; description: string | null }) {
  const [state, onSubmit, pending] = useFormAction(updateTreeAction.bind(null, treeId));
  useEffect(() => {
    if (state?.ok) toast.success("Info pohon disimpan.");
  }, [state]);
  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-4 rounded-xl border bg-card p-5">
      <div className="space-y-1.5">
        <Label htmlFor="s-name">Nama pohon</Label>
        <Input id="s-name" name="treeName" defaultValue={name} required maxLength={120} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="s-desc">Deskripsi</Label>
        <Textarea id="s-desc" name="treeDescription" defaultValue={description ?? ""} rows={3} maxLength={1000} />
      </div>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
