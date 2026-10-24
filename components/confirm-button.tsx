"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { addRow, destructiveRow } from "@/components/form-rows";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * A button that asks before running a destructive server action. The action may
 * redirect (on success) or return `{ ok: false, error }`.
 */
export function ConfirmButton({
  label,
  title,
  description,
  confirmLabel,
  onConfirm,
  successMessage,
  variant = "destructive",
  size = "default",
  ariaLabel,
  row = false,
  confirmDisabled = false,
  triggerClassName,
  children,
}: {
  label: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<{ ok: boolean; error?: string } | void>;
  successMessage?: string;
  variant?: "destructive" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon-sm";
  /** Needed when `label` is only an icon. */
  ariaLabel?: string;
  /** Render the trigger as a row inside a form group instead of a button: red, or tinted for `"action"`. */
  row?: boolean | "action";
  /** Extra classes for a button trigger (a red "Cabut" at the end of a row). */
  triggerClassName?: string;
  /** Keeps the confirm action off until the alert's own field is right (typing the tree's name). */
  confirmDisabled?: boolean;
  children?: React.ReactNode;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={row ? <button type="button" className={row === "action" ? addRow : destructiveRow} aria-label={ariaLabel} /> : <Button variant={variant} size={size} aria-label={ariaLabel} className={triggerClassName} />}>
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending || confirmDisabled}
            onClick={() =>
              start(async () => {
                const r = await onConfirm();
                if (r && !r.ok) {
                  toast.error(r.error ?? t("actions.failed"));
                  return;
                }
                if (successMessage) toast.success(successMessage);
                setOpen(false);
              })
            }
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
