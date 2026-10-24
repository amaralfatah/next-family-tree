"use client";

import { DeletePersonButton } from "@/components/delete-person-button";
import { actionRow } from "@/components/form-row-classes";
import { FormBar, FormGroup } from "@/components/form-rows";
import { PersonFields } from "@/components/person-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFormAction } from "@/lib/use-form-action";
import { updatePersonAction } from "@/lib/actions";
import type { Person } from "@/lib/types";

/** As editing a contact: Batal / Ubah data / Simpan on top, the fields, and deleting at the very end. */
export function EditPersonForm({ treeId, person }: { treeId: string; person: Person }) {
  const [state, onSubmit, pending] = useFormAction(updatePersonAction.bind(null, treeId, person.id));
  const conflict = state && !state.ok && state.conflict;
  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <FormBar title="Ubah data" cancelHref={`/pohon/${treeId}/orang/${person.id}`} submitLabel={conflict ? "Timpa" : "Simpan"} pending={pending} />
      <input type="hidden" name="updatedAt" value={person.updatedAt} />
      {conflict ? <input type="hidden" name="force" value="1" /> : null}
      <PersonFields idPrefix="edit" defaults={person} />
      {state && !state.ok ? (
        <Alert variant={conflict ? "warning" : "destructive"}>
          <AlertDescription className={conflict ? "text-foreground" : undefined}>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {conflict ? (
        <FormGroup footer="Lihat dulu perubahan anggota lain sebelum menimpanya.">
          <button type="button" onClick={() => location.reload()} className={actionRow}>
            Muat ulang
          </button>
        </FormGroup>
      ) : null}
      <DeletePersonButton treeId={treeId} personId={person.id} name={person.fullName} />
    </form>
  );
}
