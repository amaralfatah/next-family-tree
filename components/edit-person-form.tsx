"use client";

import { PersonFields } from "@/components/person-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
      <section className="rounded-2xl bg-card p-5 sm:p-6">
        <PersonFields idPrefix="edit" defaults={person} />
      </section>
      {state && !state.ok ? (
        <Alert variant={conflict ? "warning" : "destructive"}>
          <AlertDescription className={conflict ? "text-foreground" : undefined}>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        {conflict ? (
          <Button type="button" variant="outline" size="lg" onClick={() => location.reload()}>
            Muat ulang
          </Button>
        ) : null}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Menyimpan…" : conflict ? "Timpa dan simpan" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
