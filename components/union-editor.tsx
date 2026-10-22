"use client";

import { EllipsisVerticalIcon, PencilIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DateParts } from "@/components/person-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { deleteUnionAction, removeChildLinkAction, updateChildLinkAction, updateUnionAction } from "@/lib/actions";
import { splitDate } from "@/lib/dates";
import { CHILD_RELATION_LABEL, UNION_STATUS_LABEL } from "@/lib/person";
import type { ChildRelation, Union, UnionStatus } from "@/lib/types";

export function UnionEditor({ treeId, union, partnerName }: { treeId: string; union: Union; partnerName: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const start_ = splitDate(union.startDate, union.startDate ? "day" : "unknown");

  function save(fd: FormData) {
    start(async () => {
      const r = await updateUnionAction(treeId, union.id, {
        status: fd.get("status") as UnionStatus,
        startYear: String(fd.get("startYear") ?? ""),
        startMonth: String(fd.get("startMonth") ?? ""),
        startDay: String(fd.get("startDay") ?? ""),
        orderIndex: Number(fd.get("order") ?? 1) - 1,
      });
      if (r.ok) {
        toast.success("Ikatan diperbarui.");
        setOpen(false);
      } else toast.error(r.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), setConfirmDelete(false))}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Ubah ikatan" />}>
        <PencilIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah ikatan</DialogTitle>
          <DialogDescription>{partnerName ? `Pernikahan dengan ${partnerName}.` : "Ikatan dengan pasangan yang tidak diketahui."}</DialogDescription>
        </DialogHeader>
        <form action={save}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="u-status">Status</FieldLabel>
              <NativeSelect id="u-status" name="status" defaultValue={union.status} className="w-full">
                {Object.entries(UNION_STATUS_LABEL).map(([v, l]) => (
                  <NativeSelectOption key={v} value={v}>
                    {l}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <DateParts legend="Tanggal menikah" prefix="start" values={start_} idPrefix="u" />
            <Field>
              <FieldLabel htmlFor="u-order">Urutan pernikahan (istri/suami ke-)</FieldLabel>
              <Input id="u-order" name="order" type="number" min={1} max={50} defaultValue={union.orderIndex + 1} className="w-24" />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-between">
            {confirmDelete ? (
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await deleteUnionAction(treeId, union.id);
                    if (r.ok) {
                      toast.success("Ikatan dihapus.");
                      setOpen(false);
                    } else toast.error(r.error);
                  })
                }
              >
                Yakin hapus? Anak kehilangan tautan ke ikatan ini
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
                Hapus ikatan
              </Button>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ChildLinkMenu({
  treeId,
  unionId,
  childId,
  childName,
  relation,
  birthOrder,
}: {
  treeId: string;
  unionId: string;
  childId: string;
  childName: string;
  relation: ChildRelation;
  birthOrder: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), setConfirmUnlink(false))}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Atur hubungan ${childName}`} />}>
        <EllipsisVerticalIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hubungan anak</DialogTitle>
          <DialogDescription>{childName} dalam ikatan ini.</DialogDescription>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              const order = Number(fd.get("birthOrder"));
              const r = await updateChildLinkAction(treeId, unionId, childId, fd.get("relation") as ChildRelation, Number.isFinite(order) && order > 0 ? order : null);
              if (r.ok) {
                toast.success("Tersimpan.");
                setOpen(false);
              } else toast.error(r.error);
            })
          }
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="c-rel">Jenis hubungan</FieldLabel>
              <NativeSelect id="c-rel" name="relation" defaultValue={relation} className="w-full">
                {Object.entries(CHILD_RELATION_LABEL).map(([v, l]) => (
                  <NativeSelectOption key={v} value={v}>
                    Anak {l.toLowerCase()}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="c-order">Anak ke-</FieldLabel>
              <Input id="c-order" name="birthOrder" type="number" min={1} max={40} defaultValue={birthOrder ?? ""} className="w-24" />
              <FieldDescription>Dipakai untuk urutan kakak/adik bila tanggal lahir tidak diketahui.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-between">
            {confirmUnlink ? (
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await removeChildLinkAction(treeId, unionId, childId);
                    if (r.ok) {
                      toast.success("Tautan dilepas. Orangnya tetap ada di pohon.");
                      setOpen(false);
                    } else toast.error(r.error);
                  })
                }
              >
                Yakin lepas? Orangnya tetap ada di pohon
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setConfirmUnlink(true)}>
                Lepas dari ikatan ini
              </Button>
            )}
            <Button type="submit" disabled={pending}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
