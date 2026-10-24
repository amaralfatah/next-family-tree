"use client";

import { useMemo, useState } from "react";
import { FamilyChart, type EditActions } from "@/components/chart/family-chart";
import { ConflictError, PersonDialog, type Editing, type PersonStore } from "@/components/person-dialog";
import { addRelativeAction, getPersonAction, removePersonAction, savePersonAction } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions/shared";
import { UserError } from "@/lib/errors";
import type { Draft } from "@/lib/tree/draft";
import type { TreeData } from "@/lib/types";

function unwrap<T>(r: ActionResult<T>): T {
  if (r.ok) return r.data;
  throw r.conflict ? new ConflictError(r.error) : new UserError(r.error);
}

/** A real tree's chart: editors add, edit and delete people in its inspector, without leaving it. */
export function TreeChart(props: { treeId: string; data: TreeData; rootPersonId: string | null; mePersonId: string | null; canEdit: boolean }) {
  const { treeId, data, canEdit } = props;
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  // The server actions revalidate the tree, so the chart's data refreshes with their response.
  const store = useMemo<PersonStore>(
    () => ({
      load: async (personId) => unwrap(await getPersonAction(treeId, personId)),
      add: async (fd) => unwrap(await addRelativeAction(treeId, fd)),
      update: async (personId, fd) => {
        unwrap(await savePersonAction(treeId, personId, fd));
      },
      remove: async (personId) => {
        unwrap(await removePersonAction(treeId, personId));
      },
      deleteNote: "Data dan fotonya dihapus. Anak-anaknya tetap ada dan tetap terhubung dengan orang tua lainnya. Penghapusan tercatat di riwayat.",
    }),
    [treeId],
  );

  const actions: EditActions | undefined = canEdit
    ? {
        onAdd: (relation, ofId) => setEditing({ kind: "add", relation, ofId }),
        onEdit: (personId) => setEditing({ kind: "edit", personId }),
        onClose: () => setEditing(null),
      }
    : undefined;

  return (
    <FamilyChart
      {...props}
      actions={actions}
      draft={draft}
      panel={canEdit ? <PersonDialog store={store} data={data} editing={editing} onEditingChange={setEditing} onDraft={setDraft} /> : null}
      panelOpen={editing?.kind === "add" || editing?.kind === "edit"}
    />
  );
}
