"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";
import { FormGroup, FormRow, actionRow, rowInput } from "@/components/form-rows";
import { updateTreeAction } from "@/lib/actions";
import { useFormAction } from "@/lib/use-form-action";

export function TreeInfoForm({ treeId, name, description }: { treeId: string; name: string; description: string | null }) {
  const t = useTranslations("common.treeInfo");
  const [state, onSubmit, pending] = useFormAction(updateTreeAction.bind(null, treeId));
  useEffect(() => {
    if (state?.ok) toast.success(t("saved"));
  }, [state, t]);
  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <FormGroup title={t("title")} footer={state && !state.ok ? <span className="text-destructive">{state.error}</span> : undefined}>
        <FormRow label={t("name")} htmlFor="s-name">
          <input id="s-name" name="treeName" defaultValue={name} required maxLength={120} autoComplete="off" placeholder={t("required")} className={rowInput} />
        </FormRow>
      </FormGroup>
      <FormGroup title={t("description")}>
        <textarea
          id="s-desc"
          name="treeDescription"
          aria-label={t("description")}
          defaultValue={description ?? ""}
          rows={3}
          maxLength={1000}
          placeholder={t("descriptionPlaceholder")}
          className="block min-h-20 w-full resize-y bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:bg-accent/40"
        />
      </FormGroup>
      <FormGroup>
        <button type="submit" disabled={pending} className={actionRow}>
          {pending ? t("saving") : t("save")}
        </button>
      </FormGroup>
    </form>
  );
}
