"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { actionRow } from "@/components/form-rows";
import { Button } from "@/components/ui/button";
import { linkMeAction } from "@/lib/actions";

/** "This is me" / "Not me" (Ini saya / Bukan saya). With `row` it is an action row inside a form group (the profile page). */
export function LinkMeButton({ treeId, personId, unlink = false, row = false }: { treeId: string; personId: string; unlink?: boolean; row?: boolean }) {
  const t = useTranslations("person.link");
  const [pending, start] = useTransition();
  const router = useRouter();
  const onClick = () =>
    start(async () => {
      const r = await linkMeAction(treeId, unlink ? null : personId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(unlink ? t("unlinked") : t("linked"));
      if (!unlink) router.push(`/trees/${treeId}/people/${personId}`);
    });
  const label = unlink ? t("notMe") : t("me");
  if (row) {
    return (
      <button type="button" disabled={pending} onClick={onClick} className={actionRow}>
        {label}
      </button>
    );
  }
  return (
    <Button size="sm" variant={unlink ? "ghost" : "secondary"} disabled={pending} onClick={onClick}>
      {label}
    </Button>
  );
}
