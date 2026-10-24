"use client";

import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmButton } from "@/components/confirm-button";
import { FormGroup } from "@/components/form-rows";
import { deletePersonAction } from "@/lib/actions";

/** The profile's last group, as in Contacts: one red row that asks before deleting. */
export function DeletePersonButton({ treeId, personId, name }: { treeId: string; personId: string; name: string }) {
  const t = useTranslations("common.deletePerson");
  return (
    <FormGroup footer={t("footer")}>
      <ConfirmButton
        row
        label={
          <>
            <Trash2Icon className="size-[18px]" /> {t("delete")}
          </>
        }
        title={t("title", { name })}
        description={t("description")}
        confirmLabel={t("delete")}
        onConfirm={() => deletePersonAction(treeId, personId)}
      />
    </FormGroup>
  );
}
