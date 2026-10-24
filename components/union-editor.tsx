"use client";

import { EllipsisIcon, PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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
import type { ChildRelation, Union, UnionStatus } from "@/lib/types";

/**
 * An editing dialog with the same bar as the chart's form panel: Cancel on the left, the title, Save on
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
  const t = useTranslations("person.actions");
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
            <DialogClose render={<Button type="button" variant="ghost" className={barCancel} />}>{t("cancel")}</DialogClose>
            <DialogTitle className={barTitle}>{title}</DialogTitle>
            <Button type="submit" variant="ghost" className={barConfirm} disabled={pending}>
              {pending ? <Spinner /> : t("save")}
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
  const t = useTranslations("person");
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
        toast.success(t("union.updated"));
        setOpen(false);
      } else toast.error(r.error);
    });
  }

  return (
    <EditDialog
      open={open}
      onOpenChange={setOpen}
      title={t("union.editTitle")}
      description={partnerName ? t("union.withPartner", { name: partnerName }) : t("union.partnerUnknown")}
      pending={pending}
      onSave={save}
      trigger={
        row ? (
          <DialogTrigger render={<button type="button" className={addRow} />}>
            <PencilIcon className="size-[18px]" /> {t("union.editTitle")}
          </DialogTrigger>
        ) : (
          <DialogTrigger render={<Button variant="ghost" size="icon" className="hit" aria-label={t("union.editTitle")} />}>
            <PencilIcon />
          </DialogTrigger>
        )
      }
    >
      <FormGroup>
        <FormRow label={t("union.status")} htmlFor="u-status">
          <RowSelect id="u-status" name="status" defaultValue={union.status}>
            {(["married", "divorced", "widowed", "unknown"] as const).map((v) => (
              <option key={v} value={v}>
                {t(`labels.unionStatus.${v}`)}
              </option>
            ))}
          </RowSelect>
        </FormRow>
        <DateRow legend={t("union.startDate")} prefix="start" values={start_} idPrefix="u" />
        <FormRow label={t("union.marriageNumber")} htmlFor="u-order">
          <input id="u-order" name="order" inputMode="numeric" pattern="[0-9]*" maxLength={2} defaultValue={union.orderIndex + 1} autoComplete="off" className={rowInput} />
        </FormRow>
      </FormGroup>
      <FormGroup footer={t("union.deleteFooter")}>
        <ConfirmButton
          row
          label={t("union.delete")}
          title={t("union.deleteTitle")}
          description={t("union.deleteFooter")}
          confirmLabel={t("union.deleteConfirm")}
          onConfirm={async () => {
            const r = await deleteUnionAction(treeId, union.id);
            if (r.ok) {
              toast.success(t("union.deleted"));
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
  const t = useTranslations("person");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <EditDialog
      open={open}
      onOpenChange={setOpen}
      title={t("union.childLinkTitle")}
      description={t("union.childLinkDescription", { name: childName })}
      pending={pending}
      onSave={(fd) =>
        start(async () => {
          const order = Number(fd.get("birthOrder"));
          const r = await updateChildLinkAction(treeId, unionId, childId, fd.get("relation") as ChildRelation, Number.isFinite(order) && order > 0 ? order : null);
          if (r.ok) {
            toast.success(t("union.saved"));
            setOpen(false);
          } else toast.error(r.error);
        })
      }
      trigger={
        // The iOS "more" glyph, with a 44px target on touch.
        <DialogTrigger render={<Button variant="ghost" size="icon" className="hit text-muted-foreground" aria-label={t("union.childLinkMenu", { name: childName })} />}>
          <EllipsisIcon />
        </DialogTrigger>
      }
    >
      <FormGroup footer={t("union.childOrderFooter")}>
        <FormRow label={t("union.relation")} htmlFor="c-rel">
          <RowSelect id="c-rel" name="relation" defaultValue={relation}>
            {(["biological", "adopted", "step"] as const).map((v) => (
              <option key={v} value={v}>
                {t(`labels.childOf.${v}`)}
              </option>
            ))}
          </RowSelect>
        </FormRow>
        <FormRow label={t("labels.childNumber")} htmlFor="c-order">
          <input id="c-order" name="birthOrder" inputMode="numeric" pattern="[0-9]*" maxLength={2} defaultValue={birthOrder ?? ""} autoComplete="off" placeholder={t("union.childOrderPlaceholder")} className={rowInput} />
        </FormRow>
      </FormGroup>
      <FormGroup footer={t("union.unlinkFooter")}>
        <ConfirmButton
          row
          label={t("union.unlink")}
          title={t("union.unlinkTitle", { name: childName })}
          description={t("union.unlinkDescription")}
          confirmLabel={t("union.unlinkConfirm")}
          onConfirm={async () => {
            const r = await removeChildLinkAction(treeId, unionId, childId);
            if (r.ok) {
              toast.success(t("union.unlinked"));
              setOpen(false);
            }
            return r;
          }}
        />
      </FormGroup>
    </EditDialog>
  );
}
