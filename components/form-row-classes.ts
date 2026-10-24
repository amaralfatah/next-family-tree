import { cn } from "@/lib/utils";

/*
 * The class strings of the grouped-form rows (components/form-rows.tsx). They live here, outside the
 * "use client" module, so server pages can use them too: a value imported from a client module into a
 * server component is a client reference, not the string.
 */

export const rowBase = "flex min-h-11 min-w-0 items-center gap-3 px-4 transition-colors duration-150 has-[:focus-visible]:bg-accent/40";

/** A destructive action as its own row, red text, as in Contacts ("Hapus kontak"). It always asks first. */
export const destructiveRow = cn(
  rowBase,
  "w-full cursor-pointer text-left text-[15px] text-destructive outline-none hover:bg-destructive/5 focus-visible:bg-destructive/10 active:bg-destructive/10 active:duration-0 disabled:cursor-default disabled:opacity-50",
);

/** An action row in the tint colour, for the one thing a group exists to do (Buat link, Masuk). */
export const actionRow = cn(
  rowBase,
  "w-full cursor-pointer justify-center text-[15px] font-semibold text-soga-ink outline-none hover:bg-muted/60 focus-visible:bg-accent/40 active:bg-muted active:duration-0 disabled:cursor-default disabled:opacity-50",
);

/** An "add …" row at the end of a list, in the tint colour with a plus, as in Contacts ("tambah telepon"). */
export const addRow = cn(
  rowBase,
  "w-full cursor-pointer text-left text-[15px] text-soga-ink outline-none hover:bg-muted/60 focus-visible:bg-accent/40 active:bg-muted active:duration-0",
);

/** A text action in the tint colour outside a group (a page's "+ Tambah orang", paging): 44px target. */
export const toolbarAction =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[17px] text-soga-ink outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-60";

/**
 * The text inside a row: no box of its own, the row is the field, and its value sits on the right like
 * every other row's (menus, dates). Once someone has been in a required
 * field and left it empty or wrong, it turns red where it is (inline validation, not only on submit).
 */
export const rowInput =
  "h-11 w-full min-w-0 text-ellipsis bg-transparent text-right text-[15px] outline-none placeholder:text-muted-foreground/70 user-invalid:text-destructive user-invalid:placeholder:text-destructive";

/** The bar on top of a sheet, panel or editing dialog: Batal on the left, the title, the one action on the right. */
export const sheetBar =
  "grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border/80 bg-grouped/80 px-2 py-1 backdrop-blur-xl backdrop-saturate-150";
export const barCancel = "h-11 justify-self-start px-2 text-[17px] text-soga-ink";
export const barConfirm = "h-11 justify-self-end px-2 text-[17px] font-semibold text-soga-ink";
export const barTitle = "max-w-[14rem] truncate text-center text-[17px] font-semibold tracking-[-0.01em]";
