"use client";

import { useTranslations } from "next-intl";
import { FormBar, FormGroup, FormRow, SwitchRow, rowInput } from "@/components/form-rows";
import { PersonFields } from "@/components/person-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFormAction } from "@/lib/use-form-action";
import { createTreeAction } from "@/lib/actions";

export function NewTreeForm() {
  const t = useTranslations("trees.newTree");
  const [state, onSubmit, pending] = useFormAction(createTreeAction);
  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <FormBar title={t("title")} cancelHref="/trees" submitLabel={t("submit")} pending={pending} />
      {/* Grouped rows, the same form as adding or editing a person (components/form-rows.tsx). */}
      <section className="grid gap-6">
        <FormGroup title={t("about")}>
          <FormRow label={t("treeName")} htmlFor="treeName">
            <input id="treeName" name="treeName" required maxLength={120} autoComplete="off" placeholder={t("treeNamePlaceholder")} className={rowInput} />
          </FormRow>
        </FormGroup>
        <FormGroup title={t("descriptionOptional")}>
          <textarea
            id="treeDescription"
            name="treeDescription"
            aria-label={t("descriptionAria")}
            rows={2}
            maxLength={1000}
            placeholder={t("descriptionPlaceholder")}
            className="block min-h-20 w-full resize-y bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:bg-accent/40"
          />
        </FormGroup>
      </section>

      <section className="grid gap-6">
        <div className="px-4">
          <h2 className="text-[13px] text-muted-foreground">{t("firstPerson")}</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{t("firstPersonHint")}</p>
        </div>
        <PersonFields idPrefix="first" />
        <FormGroup footer={t("isMeFooter")}>
          <SwitchRow label={t("isMe")} id="isMe" name="isMe" value="on" />
        </FormGroup>
      </section>

      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
