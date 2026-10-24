"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { FormGroup } from "@/components/form-rows";
import { Input } from "@/components/ui/input";
import { deleteTreeAction, leaveTreeAction } from "@/lib/actions";

/** The irreversible actions: one red row in its own group at the end of Settings, each asking first. */
export function DangerZone({ treeId, treeName, isOwner }: { treeId: string; treeName: string; isOwner: boolean }) {
  const t = useTranslations("trees.danger");
  const [typed, setTyped] = useState("");
  return (
    <section>
      {isOwner ? (
        <FormGroup footer={t("ownerFooter")}>
          <ConfirmButton
            row
            label={t("deleteLabel")}
            title={t("deleteTitle", { name: treeName })}
            description={t("deleteDesc")}
            confirmLabel={t("deleteConfirm")}
            confirmDisabled={typed.trim() !== treeName}
            onConfirm={() => deleteTreeAction(treeId, typed)}
          >
            {/* An alert's text field, as in iOS: a plain field under the message, no group inside the alert. */}
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">
                {t.rich("typePrompt", { name: treeName, b: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong> })}
              </span>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} placeholder={treeName} />
            </label>
          </ConfirmButton>
        </FormGroup>
      ) : (
        <FormGroup footer={t("leaveFooter")}>
          <ConfirmButton
            row
            label={t("leaveLabel")}
            title={t("leaveTitle")}
            description={t("leaveDesc")}
            confirmLabel={t("leaveConfirm")}
            onConfirm={() => leaveTreeAction(treeId)}
          />
        </FormGroup>
      )}
    </section>
  );
}
