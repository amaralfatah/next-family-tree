"use client";

import { useMemo, useState } from "react";
import { FormBar, FormGroup, FormRow, PersonPicker, RowSelect, SegmentedControl, type PickItem } from "@/components/form-rows";
import { PersonFields } from "@/components/person-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFormAction } from "@/lib/use-form-action";
import { createPersonAction } from "@/lib/actions";
import type { RelationKind } from "@/lib/tree/service";
import type { ChildRelation } from "@/lib/types";

export function NewPersonForm({
  treeId,
  relation,
  ofId,
  ofName,
  unions,
  defaultUnionId,
  defaultChildRelation,
  candidates,
  returnTo,
  title,
  cancelHref,
  note,
}: {
  treeId: string;
  relation: RelationKind | null;
  ofId: string | null;
  ofName: string | null;
  unions: { id: string; label: string }[];
  defaultUnionId: string;
  defaultChildRelation: ChildRelation;
  candidates: PickItem[];
  /** Chart URL to go back to after saving; without it the new profile opens. */
  returnTo: string | null;
  title: string;
  cancelHref: string;
  /** A line under the bar, when the page needs one. */
  note?: string;
}) {
  const [state, onSubmit, pending] = useFormAction(createPersonAction.bind(null, treeId));
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string>("");
  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (n ? candidates.filter((c) => c.name.toLowerCase().includes(n) || c.nickname?.toLowerCase().includes(n)) : candidates).slice(0, 30);
  }, [q, candidates]);

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <FormBar title={title} cancelHref={cancelHref} submitLabel={mode === "existing" ? "Hubungkan" : "Simpan"} pending={pending} disabled={mode === "existing" && !picked} />
      {note ? <p className="-mt-2 px-4 text-[13px] text-muted-foreground">{note}</p> : null}
      {returnTo ? <input type="hidden" name="kembali" value={returnTo} /> : null}
      {relation && ofId ? (
        <>
          <input type="hidden" name="relKind" value={relation} />
          <input type="hidden" name="relOf" value={ofId} />
          <FormGroup title="Hubungan">
            {relation === "child" ? (
              <FormRow label="Orang tua lain" htmlFor="relUnion">
                <RowSelect id="relUnion" name="relUnion" defaultValue={defaultUnionId}>
                  {unions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                  {!unions.some((u) => u.label === "Tidak diketahui") ? <option value="">Tidak diketahui</option> : null}
                </RowSelect>
              </FormRow>
            ) : null}
            {relation === "partner" ? (
              <FormRow label="Status" htmlFor="unionStatus">
                <RowSelect id="unionStatus" name="unionStatus" defaultValue="married">
                  <option value="married">Menikah</option>
                  <option value="divorced">Bercerai (mantan)</option>
                  <option value="widowed">Salah satu wafat</option>
                  <option value="unknown">Tidak diketahui</option>
                </RowSelect>
              </FormRow>
            ) : (
              <FormRow label={relation === "parent" ? "Sebagai orang tua" : "Hubungan anak"} htmlFor="childRelation">
                <RowSelect id="childRelation" name="childRelation" defaultValue={defaultChildRelation} aria-description={relation === "parent" ? `Hubungan ${ofName} dengan orang tua ini` : undefined}>
                  <option value="biological">Kandung</option>
                  <option value="adopted">Angkat</option>
                  <option value="step">Tiri</option>
                </RowSelect>
              </FormRow>
            )}
          </FormGroup>
          <SegmentedControl
            label="Siapa yang ditambahkan"
            value={mode}
            onChange={setMode}
            options={[
              ["new", "Orang baru"],
              ["existing", "Sudah ada di pohon"],
            ]}
          />
        </>
      ) : null}

      {mode === "existing" ? (
        <>
          <input type="hidden" name="existingId" value={picked} />
          <PersonPicker items={matches} query={q} onQuery={setQ} picked={picked} onPick={setPicked} />
        </>
      ) : (
        <PersonFields idPrefix="new" />
      )}

      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
