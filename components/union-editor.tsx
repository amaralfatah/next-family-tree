"use client";

import { EllipsisVerticalIcon, PencilIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DateParts } from "@/components/person-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <form action={save} className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="u-status">Status</Label>
            <select id="u-status" name="status" defaultValue={union.status} className="field">
              {Object.entries(UNION_STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <DateParts legend="Tanggal menikah" prefix="start" values={start_} idPrefix="u" />
          <div className="space-y-1.5">
            <Label htmlFor="u-order">Urutan pernikahan (istri/suami ke-)</Label>
            <Input id="u-order" name="order" type="number" min={1} max={50} defaultValue={union.orderIndex + 1} className="w-24" />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
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
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Atur hubungan ${childName}`} />}>
        <EllipsisVerticalIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hubungan anak</DialogTitle>
          <DialogDescription>{childName} dalam ikatan ini.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
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
          <div className="space-y-1.5">
            <Label htmlFor="c-rel">Jenis hubungan</Label>
            <select id="c-rel" name="relation" defaultValue={relation} className="field">
              {Object.entries(CHILD_RELATION_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  Anak {l.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-order">Anak ke-</Label>
            <Input id="c-order" name="birthOrder" type="number" min={1} max={40} defaultValue={birthOrder ?? ""} className="w-24" />
            <p className="text-xs text-muted-foreground">Dipakai untuk urutan kakak/adik bila tanggal lahir tidak diketahui.</p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
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
              Lepas dari ikatan ini
            </Button>
            <Button type="submit" disabled={pending}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
