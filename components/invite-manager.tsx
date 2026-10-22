"use client";

import { CheckIcon, CopyIcon, LinkIcon, MessageCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
    <section className="mt-10">
      <h2 className="font-display text-2xl">Undang lewat link</h2>
      <p className="mt-1 text-sm text-muted-foreground">Link hanya ditampilkan sekali. Siapa pun yang memegang link bisa bergabung sampai link kedaluwarsa atau dicabut.</p>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-card p-4">
        <Field>
          <FieldLabel htmlFor="inv-role">Peran</FieldLabel>
          <NativeSelect id="inv-role" className="w-full" value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")}>
            <NativeSelectOption value="editor">Editor</NativeSelectOption>
            <NativeSelectOption value="viewer">Pembaca</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="inv-days">Berlaku</FieldLabel>
          <NativeSelect id="inv-days" className="w-full" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <NativeSelectOption value={1}>1 hari</NativeSelectOption>
            <NativeSelectOption value={7}>7 hari</NativeSelectOption>
            <NativeSelectOption value={14}>14 hari</NativeSelectOption>
            <NativeSelectOption value={30}>30 hari</NativeSelectOption>
            <NativeSelectOption value={90}>90 hari</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Button onClick={create} disabled={pending} className="h-9">
          {pending ? <Spinner data-icon="inline-start" /> : <LinkIcon data-icon="inline-start" />} Buat link
        </Button>
      </div>

      {link ? (
        <div className="rise mt-4 rounded-xl border bg-paper-2 p-4">
          <p className="text-sm">
            Link {ROLE_LABEL[link.role].toLowerCase()} berlaku sampai <strong>{fmt(link.expiresAt)}</strong>:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border bg-background px-3 py-2 text-sm">{link.url}</code>
            <Button variant="outline" className="h-9" onClick={copy}>
              {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />} Salin
            </Button>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" className={buttonVariants({ className: "h-9" })}>
              <MessageCircleIcon data-icon="inline-start" /> Kirim via WhatsApp
            </a>
          </div>
        </div>
      ) : null}

      {invites.length > 0 ? (
        <ul className="mt-6 divide-y overflow-hidden rounded-xl bg-card text-sm">
          {invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span className="font-medium">{ROLE_LABEL[i.role]}</span>
              <span className="flex-1 text-muted-foreground">
                {i.state === "active" ? `Aktif sampai ${fmt(i.expiresAt)}` : i.state === "expired" ? `Kedaluwarsa ${fmt(i.expiresAt)}` : "Dicabut"}
              </span>
              {i.state === "active" ? (
                <ConfirmButton
                  label="Cabut"
                  variant="ghost"
                  size="sm"
                  title="Cabut link ini?"
                  description="Link tidak bisa dipakai lagi. Anggota yang sudah bergabung lewat link ini tetap menjadi anggota."
                  confirmLabel="Cabut link"
                  successMessage="Link dicabut."
                  onConfirm={() => revokeInviteAction(treeId, i.id)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
