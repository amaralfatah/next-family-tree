"use client";

import { EllipsisIcon, PencilIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { barCancel, barConfirm, barTitle, sheetBar } from "@/components/form-row-classes";
import { FormGroup, FormRow, RowSelect, addRow, rowInput } from "@/components/form-rows";
import { DateRow } from "@/components/person-fields";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteUnionAction, removeChildLinkAction, updateChildLinkAction, updateUnionAction } from "@/lib/actions";
import { splitDate } from "@/lib/dates";
import { CHILD_RELATION_LABEL, UNION_STATUS_LABEL } from "@/lib/person";
import type { ChildRelation, Union, UnionStatus } from "@/lib/types";

/**
 * An editing dialog with the same bar as the chart's form panel: Batal on the left, the title, Simpan on
 * the right; grouped rows under it on the grouped background.
 */
function EditDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  pending,
  onSave,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactElement;
  title: string;
  description: string;
  pending: boolean;
  onSave: (fd: FormData) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden bg-grouped p-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(new FormData(e.currentTarget));
          }}
        >
          <div className={sheetBar}>
            <DialogClose render={<Button type="button" variant="ghost" className={barCancel} />}>Batal</DialogClose>
            <DialogTitle className={barTitle}>{title}</DialogTitle>
            <Button type="submit" variant="ghost" className={barConfirm} disabled={pending}>
              {pending ? <Spinner /> : "Simpan"}
            </Button>
          </div>
          <div className="grid gap-6 p-4">
            <DialogDescription className="px-4 text-[13px]">{description}</DialogDescription>
            {children}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** With `row`, the trigger is a row of the profile's marriage group ("Ubah pernikahan") instead of an icon. */
export function UnionEditor({ treeId, union, partnerName, row = false }: { treeId: string; union: Union; partnerName: string | null; row?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
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
        toast.success("Pernikahan diperbarui.");
        setOpen(false);
      } else toast.error(r.error);
    });
  }

  return (
    <EditDialog
      open={open}
      onOpenChange={setOpen}
      title="Ubah pernikahan"
      description={partnerName ? `Pernikahan dengan ${partnerName}.` : "Pasangannya tidak diketahui."}
      pending={pending}
      onSave={save}
      trigger={
        row ? (
          <DialogTrigger render={<button type="button" className={addRow} />}>
            <PencilIcon className="size-[18px]" /> Ubah pernikahan
          </DialogTrigger>
        ) : (
          <DialogTrigger render={<Button variant="ghost" size="icon" className="hit" aria-label="Ubah pernikahan" />}>
            <PencilIcon />
          </DialogTrigger>
        )
      }
    >
      <FormGroup>
        <FormRow label="Status" htmlFor="u-status">
          <RowSelect id="u-status" name="status" defaultValue={union.status}>
            {Object.entries(UNION_STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </RowSelect>
        </FormRow>
        <DateRow legend="Tanggal menikah" prefix="start" values={start_} idPrefix="u" />
        <FormRow label="Pernikahan ke-" htmlFor="u-order">
          <input id="u-order" name="order" inputMode="numeric" pattern="[0-9]*" maxLength={2} defaultValue={union.orderIndex + 1} autoComplete="off" className={rowInput} />
        </FormRow>
      </FormGroup>
      <FormGroup footer="Anak-anaknya tetap ada di pohon, tetapi tidak lagi tercatat sebagai anak pasangan ini.">
        <ConfirmButton
          row
          label="Hapus pernikahan"
          title="Hapus pernikahan ini?"
          description="Anak-anaknya tetap ada di pohon, tetapi tidak lagi tercatat sebagai anak pasangan ini."
          confirmLabel="Hapus"
          onConfirm={async () => {
            const r = await deleteUnionAction(treeId, union.id);
            if (r.ok) {
              toast.success("Pernikahan dihapus.");
              setOpen(false);
            }
            return r;
          }}
        />
      </FormGroup>
    </EditDialog>
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
    <EditDialog
      open={open}
      onOpenChange={setOpen}
      title="Hubungan anak"
      description={`${childName} sebagai anak pasangan ini.`}
      pending={pending}
      onSave={(fd) =>
        start(async () => {
          const order = Number(fd.get("birthOrder"));
          const r = await updateChildLinkAction(treeId, unionId, childId, fd.get("relation") as ChildRelation, Number.isFinite(order) && order > 0 ? order : null);
          if (r.ok) {
            toast.success("Tersimpan.");
            setOpen(false);
          } else toast.error(r.error);
        })
      }
      trigger={
        // The iOS "more" glyph, with a 44px target on touch.
        <DialogTrigger render={<Button variant="ghost" size="icon" className="hit text-muted-foreground" aria-label={`Atur hubungan ${childName}`} />}>
          <EllipsisIcon />
        </DialogTrigger>
      }
    >
      <FormGroup footer="“Anak ke-” dipakai untuk urutan kakak/adik bila tanggal lahir tidak diketahui.">
        <FormRow label="Hubungan" htmlFor="c-rel">
          <RowSelect id="c-rel" name="relation" defaultValue={relation}>
            {Object.entries(CHILD_RELATION_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                Anak {l.toLowerCase()}
              </option>
            ))}
          </RowSelect>
        </FormRow>
        <FormRow label="Anak ke-" htmlFor="c-order">
          <input id="c-order" name="birthOrder" inputMode="numeric" pattern="[0-9]*" maxLength={2} defaultValue={birthOrder ?? ""} autoComplete="off" placeholder="Tidak diketahui" className={rowInput} />
        </FormRow>
      </FormGroup>
      <FormGroup footer="Orangnya tetap ada di pohon, hanya tidak lagi tercatat sebagai anak pasangan ini.">
        <ConfirmButton
          row
          label="Lepas sebagai anak pasangan ini"
          title={`Lepas ${childName} dari pasangan ini?`}
          description="Orangnya tetap ada di pohon."
          confirmLabel="Lepas"
          onConfirm={async () => {
            const r = await removeChildLinkAction(treeId, unionId, childId);
            if (r.ok) {
              toast.success("Tautan dilepas. Orangnya tetap ada di pohon.");
              setOpen(false);
            }
            return r;
          }}
        />
      </FormGroup>
    </EditDialog>
  );
}
