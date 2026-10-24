"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormGroup, FormRow, RowSelect } from "@/components/form-rows";
import { setRootAction } from "@/lib/actions";

/**
 * Who the chart opens on for everyone, until they pick someone else to look from. Like a setting on iOS it
 * applies as soon as it is picked, with no Save step.
 */
export function RootPersonForm({ treeId, rootPersonId, persons }: { treeId: string; rootPersonId: string | null; persons: { id: string; fullName: string }[] }) {
  const t = useTranslations("trees.root");
  const [value, setValue] = useState(rootPersonId ?? persons[0]?.id ?? "");
  const [pending, start] = useTransition();
  return (
    <div>
      <FormGroup title={t("title")} footer={t("footer")}>
        <FormRow label={t("label")} htmlFor="s-root">
          <RowSelect
            id="s-root"
            value={value}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value;
              const before = value;
              setValue(next);
              start(async () => {
                const r = await setRootAction(treeId, next);
                if (r.ok) {
                  toast.success(t("saved"));
                  return;
                }
                setValue(before);
                toast.error(r.error);
              });
            }}
          >
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </RowSelect>
        </FormRow>
      </FormGroup>
    </div>
  );
}
