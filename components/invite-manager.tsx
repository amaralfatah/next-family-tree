"use client";

import { CheckIcon, CopyIcon, LinkIcon, MessageCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
    ? encodeURIComponent(`Assalamu'alaikum, yuk lengkapi silsilah keluarga kita di Wargi sebagai ${ROLE_LABEL[link.role].toLowerCase()}: ${link.url}`)
    : "";

  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl">Undang lewat link</h2>
      <p className="mt-1 text-sm text-muted-foreground">Link hanya ditampilkan sekali. Siapa pun yang memegang link bisa bergabung sampai link kedaluwarsa atau dicabut.</p>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="inv-role">Peran</Label>
          <select id="inv-role" className="field !w-40" value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")}>
            <option value="editor">Editor</option>
            <option value="viewer">Pembaca</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-days">Berlaku</Label>
          <select id="inv-days" className="field !w-36" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>1 hari</option>
            <option value={7}>7 hari</option>
            <option value={14}>14 hari</option>
            <option value={30}>30 hari</option>
            <option value={90}>90 hari</option>
          </select>
        </div>
        <Button onClick={create} disabled={pending} className="h-9">
          <LinkIcon data-icon="inline-start" /> {pending ? "Membuat…" : "Buat link"}
        </Button>
      </div>

      {link ? (
        <div className="rise mt-4 rounded-xl border border-soga/50 bg-accent/50 p-4">
          <p className="text-sm">
            Link {ROLE_LABEL[link.role].toLowerCase()} berlaku sampai <strong>{fmt(link.expiresAt)}</strong>:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border bg-background px-3 py-2 text-sm">{link.url}</code>
            <Button variant="outline" className="h-9" onClick={copy}>
              {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />} Salin
            </Button>
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1f8f4e] px-3 text-sm font-medium text-white hover:bg-[#1a7a43]"
            >
              <MessageCircleIcon className="size-4" /> Kirim via WhatsApp
            </a>
          </div>
        </div>
      ) : null}

      {invites.length > 0 ? (
        <ul className="mt-6 divide-y overflow-hidden rounded-xl border bg-card text-sm">
          {invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span className="font-medium">{ROLE_LABEL[i.role]}</span>
              <span className="flex-1 text-muted-foreground">
                {i.state === "active" ? `Aktif sampai ${fmt(i.expiresAt)}` : i.state === "expired" ? `Kedaluwarsa ${fmt(i.expiresAt)}` : "Dicabut"}
              </span>
              {i.state === "active" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await revokeInviteAction(treeId, i.id);
                      if (r.ok) toast.success("Link dicabut.");
                      else toast.error(r.error);
                    })
                  }
                >
                  Cabut
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
