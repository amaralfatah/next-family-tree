"use client";

import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { FormGroup } from "@/components/form-rows";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { initials } from "@/components/user-menu";
import { changeRoleAction, removeMemberAction, transferOwnershipAction } from "@/lib/actions";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Member {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  personName: string | null;
}

/**
 * One member as a list row: who they are, their role as the value on the right. For the owner the row
 * opens the member's settings (role as a checklist, hand over ownership, remove), like a contact's detail.
 */
export function MemberRow({ treeId, member, isSelf, canManage }: { treeId: string; member: Member; isSelf: boolean; canManage: boolean }) {
  const t = useTranslations("trees");
  const manageable = canManage && !isSelf && member.role !== "owner";
  const body = (
    <>
      <Avatar className="size-9">
        {member.image ? <AvatarImage src={member.image} alt="" referrerPolicy="no-referrer" /> : null}
        <AvatarFallback className="bg-muted text-xs font-semibold">{initials(member.name) || "?"}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] font-medium">
          {member.name} {isSelf ? <span className="font-normal text-muted-foreground">{t("members.you")}</span> : null}
        </span>
        <span className="block truncate text-[13px] text-muted-foreground">
          {member.email}
          {member.personName ? t("members.recordedAs", { name: member.personName }) : ""}
        </span>
      </span>
      <span className="shrink-0 text-[15px] text-muted-foreground">{t(`roles.${member.role}`)}</span>
    </>
  );
  const row = "flex min-h-14 w-full items-center gap-3 px-4 py-2";
  if (!manageable) return <li className={row}>{body}</li>;
  return (
    <li>
      <MemberSettings treeId={treeId} member={member}>
        <span className={cn(row, "cursor-pointer transition-colors duration-150 hover:bg-muted/50 active:bg-muted active:duration-0")}>
          {body}
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
        </span>
      </MemberSettings>
    </li>
  );
}

function MemberSettings({ treeId, member, children }: { treeId: string; member: Member; children: React.ReactNode }) {
  const t = useTranslations("trees");
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(member.role);
  const [pending, start] = useTransition();

  // A setting: it applies on tap, with no Save step, and goes back if the server says no.
  function pick(next: "editor" | "viewer") {
    if (next === role) return;
    const before = role;
    setRole(next);
    start(async () => {
      const r = await changeRoleAction(treeId, member.userId, next);
      if (r.ok) {
        toast.success(t("members.roleUpdated"));
        return;
      }
      setRole(before);
      toast.error(r.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button type="button" className="block w-full text-left outline-none focus-visible:bg-accent/40" aria-label={t("members.manageAria", { name: member.name })} />}>{children}</DialogTrigger>
      <DialogContent className="gap-6 bg-grouped">
        <DialogHeader>
          <DialogTitle>{member.name}</DialogTitle>
          <DialogDescription>{member.email}</DialogDescription>
        </DialogHeader>
        <FormGroup title={t("members.roleTitle")}>
          {(["editor", "viewer"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              disabled={pending}
              onClick={() => pick(r)}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-accent/40 active:bg-muted active:duration-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px]">{t(`roles.${r}`)}</span>
                <span className="block text-[13px] text-muted-foreground">{t(`roleHint.${r}`)}</span>
              </span>
              {pending && role === r ? <Spinner className="size-4" /> : <CheckIcon className={cn("size-[18px] text-soga-ink", role === r ? "visible" : "invisible")} aria-hidden />}
            </button>
          ))}
        </FormGroup>
        <FormGroup footer={t("members.transferFooter")}>
          <ConfirmButton
            row="action"
            label={t("members.transferLabel")}
            title={t("members.transferTitle", { name: member.name })}
            description={t("members.transferDesc")}
            confirmLabel={t("members.transferConfirm")}
            successMessage={t("members.transferSuccess")}
            onConfirm={async () => {
              const r = await transferOwnershipAction(treeId, member.userId);
              if (r.ok) setOpen(false);
              return r;
            }}
          />
        </FormGroup>
        <FormGroup footer={t("members.removeFooter")}>
          <ConfirmButton
            row
            label={t("members.removeLabel")}
            title={t("members.removeTitle", { name: member.name })}
            description={t("members.removeDesc")}
            confirmLabel={t("members.removeConfirm")}
            successMessage={t("members.removeSuccess")}
            onConfirm={async () => {
              const r = await removeMemberAction(treeId, member.userId);
              if (r.ok) setOpen(false);
              return r;
            }}
          />
        </FormGroup>
      </DialogContent>
    </Dialog>
  );
}
