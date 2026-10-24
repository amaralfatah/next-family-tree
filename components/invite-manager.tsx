"use client";

import { CheckIcon, CopyIcon, LinkIcon, MessageCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { FormGroup, FormRow, RowSelect, actionRow } from "@/components/form-rows";
import { Spinner } from "@/components/ui/spinner";
import { createInviteAction, revokeInviteAction } from "@/lib/actions";
import { ROLE_LABEL } from "@/lib/person";
import type { Role } from "@/lib/types";

interface Invite {
  id: string;
  role: Role;
  expiresAt: string;
  state: "active" | "expired" | "revoked";
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

export function InviteManager({ treeId, invites }: { treeId: string; invites: Invite[] }) {
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
      setLink({ url: `${location.origin}/undangan/${r.data.token}`, expiresAt: r.data.expiresAt, role });
      setCopied(false);
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      toast.success("Link disalin.");
    } catch {
      toast.error("Tidak bisa menyalin otomatis. Salin link secara manual.");
    }
  }

  const waText = link
    ? encodeURIComponent(`Assalamu’alaikum, yuk lengkapi silsilah keluarga kita di Sararia Family Tree sebagai ${ROLE_LABEL[link.role].toLowerCase()}: ${link.url}`)
    : "";

  return (
    <section className="grid gap-6">
      <FormGroup title="Undang lewat link" footer="Link hanya ditampilkan sekali. Siapa pun yang memegang link bisa bergabung sampai link kedaluwarsa atau dicabut.">
        <FormRow label="Peran" htmlFor="inv-role">
          <RowSelect id="inv-role" value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")}>
            <option value="editor">Editor</option>
            <option value="viewer">Pembaca</option>
          </RowSelect>
        </FormRow>
        <FormRow label="Berlaku" htmlFor="inv-days">
          <RowSelect id="inv-days" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>1 hari</option>
            <option value={7}>7 hari</option>
            <option value={14}>14 hari</option>
            <option value={30}>30 hari</option>
            <option value={90}>90 hari</option>
          </RowSelect>
        </FormRow>
        <button type="button" onClick={create} disabled={pending} className={actionRow}>
          {pending ? <Spinner /> : <LinkIcon className="size-4" />} Buat link
        </button>
      </FormGroup>

      {link ? (
        <div className="rise">
          <FormGroup title={`Link ${ROLE_LABEL[link.role].toLowerCase()}`} footer={<>Berlaku sampai {fmt(link.expiresAt)}.</>}>
            <p className="truncate px-4 py-3 font-mono text-[13px] text-muted-foreground select-all">{link.url}</p>
            <button type="button" onClick={copy} className={actionRow}>
              {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />} {copied ? "Disalin" : "Salin link"}
            </button>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" className={actionRow}>
              <MessageCircleIcon className="size-4" /> Kirim via WhatsApp
            </a>
          </FormGroup>
        </div>
      ) : null}

      {invites.length > 0 ? (
        <FormGroup title="Link yang pernah dibuat">
          {invites.map((i) => (
            <div key={i.id} className="flex min-h-11 items-center gap-3 py-1 pl-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px]">{ROLE_LABEL[i.role]}</span>
                <span className="block text-[13px] text-muted-foreground">
                  {i.state === "active" ? `Aktif sampai ${fmt(i.expiresAt)}` : i.state === "expired" ? `Kedaluwarsa ${fmt(i.expiresAt)}` : "Dicabut"}
                </span>
              </span>
              {i.state === "active" ? (
                <ConfirmButton
                  label="Cabut"
                  variant="ghost"
                  triggerClassName="h-11 px-4 text-[15px] text-destructive hover:text-destructive"
                  title="Cabut link ini?"
                  description="Link tidak bisa dipakai lagi. Anggota yang sudah bergabung lewat link ini tetap menjadi anggota."
                  confirmLabel="Cabut link"
                  successMessage="Link dicabut."
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
