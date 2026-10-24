"use client";

import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { barCancel, barConfirm, barTitle, rowBase, rowInput, sheetBar } from "@/components/form-row-classes";
import { Spinner } from "@/components/ui/spinner";

export { actionRow, addRow, destructiveRow, rowInput, toolbarAction } from "@/components/form-row-classes";

/*
 * An iOS grouped form (Contacts while editing, Settings): one inset card per group, rows divided by
 * hairlines, and nothing boxed inside it. Text fields are bare text in their row, a single choice is a
 * checkmark, an on/off is a switch.
 */

/** One group: an optional caption above, an optional footnote below. */
export function FormGroup({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid min-w-0 gap-1.5">
      {title ? <h3 className="px-4 text-[13px] leading-tight text-muted-foreground">{title}</h3> : null}
      <div className="min-w-0 divide-y divide-border/70 overflow-hidden rounded-xl bg-card">{children}</div>
      {footer ? <p className="px-4 text-[13px] leading-snug text-muted-foreground">{footer}</p> : null}
    </section>
  );
}






/** A read-only fact: label on the left, value on the right, like a field of a contact. */
export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={cn(rowBase, "py-2.5")}>
      <span className="w-32 shrink-0 text-[15px] text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-right text-[15px]">{children}</span>
    </div>
  );
}

/** A label on the left and its control filling the rest of the row. */
export function FormRow({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className={rowBase}>
      <label htmlFor={htmlFor} className="w-32 shrink-0 text-[15px]">
        {label}
      </label>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </div>
  );
}


/** A native select as the value of a row, right-aligned with the up/down chevrons of an iOS menu. */
export function RowSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <span className="relative flex min-w-0 flex-1 items-center">
      <select
        {...props}
        className={cn("h-11 w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent pr-6 text-[15px] text-muted-foreground outline-none [text-align-last:right]", className)}
      />
      <ChevronsUpDownIcon className="pointer-events-none absolute right-0 size-4 text-muted-foreground" aria-hidden />
    </span>
  );
}

/** One option of a single choice: the chosen row gets a checkmark, as in iOS Settings. */
export function CheckRow({ name, value, label, defaultChecked, id }: { name: string; value: string; label: string; defaultChecked?: boolean; id: string }) {
  return (
    <label htmlFor={id} className={cn(rowBase, "cursor-pointer active:bg-muted active:duration-0")}>
      <input type="radio" id={id} name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="min-w-0 flex-1 text-[15px]">{label}</span>
      <CheckIcon className="invisible size-[18px] shrink-0 text-soga-ink peer-checked:visible" aria-hidden />
    </label>
  );
}

/** An on/off row with an iOS switch. */
export function SwitchRow({ label, id, ...props }: { label: string; id: string } & Omit<React.ComponentProps<"input">, "type" | "id">) {
  return (
    <label htmlFor={id} className={cn(rowBase, "cursor-pointer")}>
      <span className="min-w-0 flex-1 text-[15px]">{label}</span>
      <input
        type="checkbox"
        role="switch"
        id={id}
        {...props}
        className="relative h-[31px] w-[51px] shrink-0 cursor-pointer appearance-none rounded-full bg-muted-foreground/25 outline-none transition-colors duration-200 before:absolute before:top-0.5 before:left-0.5 before:size-[27px] before:rounded-full before:bg-white before:shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] before:transition-transform before:duration-200 before:ease-[cubic-bezier(0.32,0.72,0,1)] checked:bg-soga checked:before:translate-x-5 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:before:transition-none"
      />
    </label>
  );
}

/** An iOS segmented control: a muted track with the chosen segment raised on it. */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-[10px] bg-muted p-0.5" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "h-8 flex-1 rounded-lg px-3 text-sm outline-none transition-[color,background-color,box-shadow,opacity] duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70 active:duration-0",
            value === v ? "bg-card font-medium text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export interface PickItem {
  id: string;
  name: string;
  nickname: string | null;
  birthYear: string | null;
}

/** A searchable list with a checkmark on the chosen row; the search is its first row. */
export function PersonPicker({ items, query, onQuery, picked, onPick }: { items: PickItem[]; query: string; onQuery: (q: string) => void; picked: string; onPick: (id: string) => void }) {
  const t = useTranslations("common.picker");
  return (
    <FormGroup>
      <label className={rowBase}>
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input aria-label={t("searchAria")} autoComplete="off" value={query} onChange={(e) => onQuery(e.target.value)} placeholder={t("searchPlaceholder")} className={cn(rowInput, "text-left")} />
      </label>
      <ul className="max-h-80 divide-y divide-border/70 overflow-y-auto" role="listbox" aria-label={t("listAria")}>
        {items.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              role="option"
              aria-selected={picked === c.id}
              onClick={() => onPick(c.id)}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-[15px] outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-accent/40 active:bg-muted active:duration-0"
            >
              <span className="min-w-0 flex-1 truncate">
                {c.name}
                {c.nickname ? <span className="text-muted-foreground"> “{c.nickname}”</span> : null}
              </span>
              {c.birthYear ? <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">{t("born", { year: c.birthYear })}</span> : null}
              <CheckIcon className={cn("size-[18px] shrink-0 text-soga-ink", picked === c.id ? "visible" : "invisible")} aria-hidden />
            </button>
          </li>
        ))}
        {items.length === 0 ? <li className="px-4 py-3 text-[15px] text-muted-foreground">{t("empty")}</li> : null}
      </ul>
    </FormGroup>
  );
}

/**
 * A row that shows a value and opens its editor in place underneath, as dates do in Calendar: the value
 * turns the tint colour while open. The editor stays in the form when closed, so its fields still submit.
 */
export function DisclosureRow({ label, value, placeholder, defaultOpen = false, children }: { label: string; value: string; placeholder: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const editorId = useId();
  return (
    <>
      <button type="button" aria-expanded={open} aria-controls={editorId} onClick={() => setOpen((o) => !o)} className={cn(rowBase, "w-full cursor-pointer text-left active:bg-muted active:duration-0")}>
        <span className="w-32 shrink-0 text-[15px]">{label}</span>
        <span className={cn("min-w-0 flex-1 truncate text-right text-[15px] transition-colors duration-150", open ? "text-soga-ink" : value ? "text-foreground" : "text-muted-foreground")}>{value || placeholder}</span>
      </button>
      <div id={editorId} hidden={!open} className="divide-y divide-border/70 *:pl-8">
        {children}
      </div>
    </>
  );
}

/**
 * The top bar of a full-page form (edit a person, add a person, new tree): the same Cancel / title / Save bar
 * as the chart's form panel, stuck under the app's navigation bar while the form scrolls.
 */
export function FormBar({ title, cancelHref, submitLabel, pending, disabled }: { title: string; cancelHref: string; submitLabel?: string; pending?: boolean; disabled?: boolean }) {
  const t = useTranslations("common.actions");
  return (
    <div className={cn("panel-bar material sticky top-[calc(3.5rem+1px+env(safe-area-inset-top))] z-20 -mx-4 sm:mx-0 sm:rounded-xl", sheetBar)}>
      <Link href={cancelHref} className={cn(barCancel, "inline-flex items-center rounded-md outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50")}>
        {t("cancel")}
      </Link>
      <h1 className={barTitle}>{title}</h1>
      <button type="submit" disabled={pending || disabled} className={cn(barConfirm, "inline-flex items-center rounded-md outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40")}>
        {pending ? <Spinner /> : (submitLabel ?? t("save"))}
      </button>
    </div>
  );
}
