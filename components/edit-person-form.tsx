"use client";

import { PersonFields } from "@/components/person-fields";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";
import { updatePersonAction } from "@/lib/actions";
import type { Person } from "@/lib/types";

export function EditPersonForm({ treeId, person }: { treeId: string; person: Person }) {
  const [state, onSubmit, pending] = useFormAction(updatePersonAction.bind(null, treeId, person.id));
  const conflict = state && !state.ok && state.conflict;
  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-6">
      <input type="hidden" name="updatedAt" value={person.updatedAt} />
      {conflict ? <input type="hidden" name="force" value="1" /> : null}
      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <PersonFields idPrefix="edit" defaults={person} />
      </section>
      {state && !state.ok ? (
        <p role="alert" className={conflict ? "rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm" : "rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"}>
          {state.error}
        </p>
      ) : null}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex justify-end gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        {conflict ? (
          <Button type="button" variant="outline" size="lg" className="h-11" onClick={() => location.reload()}>
            Muat ulang
          </Button>
        ) : null}
        <Button type="submit" size="lg" className="h-11 px-6" disabled={pending}>
          {pending ? "Menyimpan…" : conflict ? "Timpa dan simpan" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
