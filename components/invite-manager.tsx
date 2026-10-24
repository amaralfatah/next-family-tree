"use client";

import { CheckIcon, CopyIcon, LinkIcon, MessageCircleIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { FormGroup, FormRow, RowSelect, actionRow } from "@/components/form-rows";
import { Spinner } from "@/components/ui/spinner";
import { createInviteAction, revokeInviteAction } from "@/lib/actions";
import type { Role } from "@/lib/types";

interface Invite {
  id: string;
  role: Role;
  expiresAt: string;
  state: "active" | "expired" | "revoked";
}

export function InviteManager({ treeId, invites }: { treeId: string; invites: Invite[] }) {
  const t = useTranslations("trees");
  const locale = useLocale();
  const format = useFormatter();
  const fmt = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "long", year: "numeric" });
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [days, setDays] = useState(14);
  const [link, setLink] = useState<{ url: string; expiresAt: string; role: Role } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function create() {
    start(async () => {
      const r = await createInviteAction(treeId, role, days);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setLink({ url: `${location.origin}/${locale}/invite/${r.data.token}`, expiresAt: r.data.expiresAt, role });
      setCopied(false);
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      toast.success(t("invite.copiedToast"));
    } catch {
      toast.error(t("invite.copyFailed"));
    }
  }

  const waText = link
    ? encodeURIComponent(t("invite.whatsappText", { role: t(`rolesLower.${link.role}`), url: link.url }))
    : "";

  return (
    <section className="grid gap-6">
      <FormGroup title={t("invite.title")} footer={t("invite.footer")}>
        <FormRow label={t("invite.role")} htmlFor="inv-role">
          <RowSelect id="inv-role" value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")}>
            <option value="editor">{t("roles.editor")}</option>
            <option value="viewer">{t("roles.viewer")}</option>
          </RowSelect>
        </FormRow>
        <FormRow label={t("invite.validFor")} htmlFor="inv-days">
          <RowSelect id="inv-days" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[1, 7, 14, 30, 90].map((n) => (
              <option key={n} value={n}>
                {t("invite.days", { count: n })}
              </option>
            ))}
          </RowSelect>
        </FormRow>
        <button type="button" onClick={create} disabled={pending} className={actionRow}>
          {pending ? <Spinner /> : <LinkIcon className="size-4" />} {t("invite.create")}
        </button>
      </FormGroup>

      {link ? (
        <div className="rise">
          <FormGroup title={t("invite.linkTitle", { role: t(`rolesLower.${link.role}`) })} footer={t("invite.validUntil", { date: fmt(link.expiresAt) })}>
            <p className="truncate px-4 py-3 font-mono text-[13px] text-muted-foreground select-all">{link.url}</p>
            <button type="button" onClick={copy} className={actionRow}>
              {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />} {copied ? t("invite.copied") : t("invite.copy")}
            </button>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" className={actionRow}>
              <MessageCircleIcon className="size-4" /> {t("invite.whatsapp")}
            </a>
          </FormGroup>
        </div>
      ) : null}

      {invites.length > 0 ? (
        <FormGroup title={t("invite.pastTitle")}>
          {invites.map((i) => (
            <div key={i.id} className="flex min-h-11 items-center gap-3 py-1 pl-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px]">{t(`roles.${i.role}`)}</span>
                <span className="block text-[13px] text-muted-foreground">
                  {i.state === "active" ? t("invite.activeUntil", { date: fmt(i.expiresAt) }) : i.state === "expired" ? t("invite.expiredOn", { date: fmt(i.expiresAt) }) : t("invite.revoked")}
                </span>
              </span>
              {i.state === "active" ? (
                <ConfirmButton
                  label={t("invite.revoke")}
                  variant="ghost"
                  triggerClassName="h-11 px-4 text-[15px] text-destructive hover:text-destructive"
                  title={t("invite.revokeTitle")}
                  description={t("invite.revokeDesc")}
                  confirmLabel={t("invite.revokeConfirm")}
                  successMessage={t("invite.revokeSuccess")}
                  onConfirm={() => revokeInviteAction(treeId, i.id)}
                />
              ) : null}
            </div>
          ))}
        </FormGroup>
      ) : null}
    </section>
  );
}
