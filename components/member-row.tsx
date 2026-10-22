"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { initials } from "@/components/user-menu";
import { changeRoleAction, removeMemberAction, transferOwnershipAction } from "@/lib/actions";
import { ROLE_LABEL } from "@/lib/person";
import type { Role } from "@/lib/types";

interface Member {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  personName: string | null;
}

export function MemberRow({ treeId, member, isSelf, canManage }: { treeId: string; member: Member; isSelf: boolean; canManage: boolean }) {
  const [pending, start] = useTransition();
  const manageable = canManage && !isSelf && member.role !== "owner";
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Avatar className="size-9">
        {member.image ? <AvatarImage src={member.image} alt="" referrerPolicy="no-referrer" /> : null}
        <AvatarFallback className="bg-accent text-xs font-semibold">{initials(member.name) || "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {member.name} {isSelf ? <span className="font-normal text-muted-foreground">(Anda)</span> : null}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {member.email}
          {member.personName ? ` · tercatat sebagai ${member.personName}` : ""}
        </p>
      </div>
      {manageable ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <NativeSelect size="sm"
            aria-label={`Peran ${member.name}`}
            
            value={member.role}
            disabled={pending}
            onChange={(e) =>
              start(async () => {
                const r = await changeRoleAction(treeId, member.userId, e.target.value as "editor" | "viewer");
                if (r.ok) toast.success("Peran diperbarui.");
                else toast.error(r.error);
              })
            }
          >
            <NativeSelectOption value="editor">Editor</NativeSelectOption>
            <NativeSelectOption value="viewer">Pembaca</NativeSelectOption>
          </NativeSelect>
          <ConfirmButton
            label="Jadikan pemilik"
            variant="ghost"
            size="sm"
            title={`Serahkan kepemilikan ke ${member.name}?`}
            description="Anda akan menjadi editor. Pemilik baru bisa mengelola anggota dan menghapus pohon."
            confirmLabel="Serahkan"
            successMessage="Kepemilikan diserahkan."
            onConfirm={() => transferOwnershipAction(treeId, member.userId)}
          />
          <ConfirmButton
            label="Keluarkan"
            variant="ghost"
            size="sm"
            title={`Keluarkan ${member.name}?`}
            description="Ia tidak bisa lagi membuka pohon ini. Data yang sudah ia isi tetap ada."
            confirmLabel="Keluarkan"
            successMessage="Anggota dikeluarkan."
            onConfirm={() => removeMemberAction(treeId, member.userId)}
          />
        </div>
      ) : (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{ROLE_LABEL[member.role]}</span>
      )}
    </li>
  );
}
