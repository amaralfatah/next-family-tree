"use client";

import { useTranslations } from "next-intl";
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
  /** `label` is the partner's name, or null when the other parent is unknown. */
  unions: { id: string; label: string | null }[];
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
  const t = useTranslations("person");
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
      <FormBar title={title} cancelHref={cancelHref} submitLabel={mode === "existing" ? t("actions.link") : t("actions.save")} pending={pending} disabled={mode === "existing" && !picked} />
      {note ? <p className="-mt-2 px-4 text-[13px] text-muted-foreground">{note}</p> : null}
      {returnTo ? <input type="hidden" name="back" value={returnTo} /> : null}
      {relation && ofId ? (
        <>
          <input type="hidden" name="relKind" value={relation} />
          <input type="hidden" name="relOf" value={ofId} />
          <FormGroup title={t("new.relationship")}>
            {relation === "child" ? (
              <FormRow label={t("new.otherParent")} htmlFor="relUnion">
                <RowSelect id="relUnion" name="relUnion" defaultValue={defaultUnionId}>
                  {unions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label ?? t("common.unknown")}
                    </option>
                  ))}
                  {!unions.some((u) => u.label === null) ? <option value="">{t("common.unknown")}</option> : null}
                </RowSelect>
              </FormRow>
            ) : null}
            {relation === "partner" ? (
              <FormRow label={t("new.status")} htmlFor="unionStatus">
                <RowSelect id="unionStatus" name="unionStatus" defaultValue="married">
                  <option value="married">{t("labels.unionStatusAdd.married")}</option>
                  <option value="divorced">{t("labels.unionStatusAdd.divorced")}</option>
                  <option value="widowed">{t("labels.unionStatusAdd.widowed")}</option>
                  <option value="unknown">{t("labels.unionStatusAdd.unknown")}</option>
                </RowSelect>
              </FormRow>
            ) : (
              <FormRow label={relation === "parent" ? t("new.asParent") : t("new.childRelationship")} htmlFor="childRelation">
                <RowSelect id="childRelation" name="childRelation" defaultValue={defaultChildRelation} aria-description={relation === "parent" ? t("new.parentRelationshipHint", { name: ofName ?? "" }) : undefined}>
                  <option value="biological">{t("labels.childRelation.biological")}</option>
                  <option value="adopted">{t("labels.childRelation.adopted")}</option>
                  <option value="step">{t("labels.childRelation.step")}</option>
                </RowSelect>
              </FormRow>
            )}
          </FormGroup>
          <SegmentedControl
            label={t("new.whoIsAdded")}
            value={mode}
            onChange={setMode}
            options={[
              ["new", t("new.newPerson")],
              ["existing", t("new.existingPerson")],
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
