"use client";

import { useState, useTransition } from "react";
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
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant={variant} size={size} aria-label={ariaLabel} />}>{label}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await onConfirm();
                if (r && !r.ok) {
                  toast.error(r.error ?? "Gagal.");
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
