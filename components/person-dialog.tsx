"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { barCancel, barConfirm, sheetBar } from "@/components/form-row-classes";
import { FormGroup, FormRow, PersonPicker, RowSelect, SegmentedControl, destructiveRow, rowInput } from "@/components/form-rows";
import { PersonFields } from "@/components/person-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { AccessError } from "@/lib/access";
import { UserError } from "@/lib/errors";
import type { Draft } from "@/lib/tree/draft";
import type { RelationKind, RelationSpec } from "@/lib/tree/service";
import type { ChildRelation, Gender, Person, TreeData, UnionStatus } from "@/lib/types";
import { useWide } from "@/lib/use-wide";
import { cn } from "@/lib/utils";

export type Editing = { kind: "add"; relation: RelationKind; ofId: string } | { kind: "edit"; personId: string } | { kind: "delete"; personId: string } | null;

/** Someone else saved this person after the form was opened; saving again overwrites their change. */
export class ConflictError extends UserError {}

/** Where the dialog saves: the browser's PGlite on /demo, the server actions on a real tree. */
export interface PersonStore {
  /** The chart's copy of a person leaves out notes and birthplace; the edit form needs the whole row. */
  load?: (personId: string) => Promise<Person>;
  /**
   * Returns the id of the person added, or linked when the form carries `existingId`. The form also
   * carries `relKind` and `relOf`.
   */
  add: (fd: FormData) => Promise<string>;
  /** May throw ConflictError; the form then carries `force=1` on the next save. */
  update: (personId: string, fd: FormData) => Promise<void>;
  remove: (personId: string) => Promise<void>;
  deleteNote: string;
  /** Runs after every save, before the panel closes. */
  onSaved?: () => Promise<void>;
}

const RELATION_TITLE: Record<RelationKind, string> = { parent: "orang tua", partner: "pasangan", child: "anak", sibling: "saudara" };

/** Same rule as the server actions: only known errors carry a message meant for the user. */
function message(e: unknown) {
  if (e instanceof UserError || e instanceof AccessError) return e.message;
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Data tidak valid.";
  return "Terjadi kesalahan.";
}

const text = (fd: FormData, k: string) => (fd.get(k) ?? "").toString().trim();

/**
 * Add a relative, edit or delete someone without leaving the chart. Adding and editing fill the chart's
 * inspector (a sheet from the bottom on phones) and report what they would change through `onDraft`, so
 * the chart can draw the new card before it is saved. Deleting asks in an alert.
 */
export function PersonDialog({
  store,
  data,
  editing: request,
  onEditingChange,
  onDraft,
}: {
  store: PersonStore;
  data: TreeData;
  editing: Editing;
  onEditingChange: (next: Editing) => void;
  onDraft?: (draft: Draft | null) => void;
}) {
  const router = useRouter();
  const isWide = useWide();
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  // State, not a ref: the form mounts inside the sheet's portal after this component, and the draft
  // effect below has to run again once it is there.
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState(false);
  const [source, setSource] = useState<"new" | "existing">("new");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState("");
  // Bumped on every keystroke, so the draft on the chart follows the form.
  const [typed, setTyped] = useState(0);

  const requestedId = request?.kind === "add" ? request.ofId : request?.personId;
  const requested = data.persons.find((p) => p.id === requestedId);
  // While the panel animates out the request is already gone (and a deleted person with it): keep showing
  // what it was opened for instead of an empty form.
  const [last, setLast] = useState<{ editing: NonNullable<Editing>; person: Person } | null>(null);
  if (request && requested && (last?.editing !== request || last.person !== requested)) setLast({ editing: request, person: requested });
  const editing = request && requested ? request : (last?.editing ?? null);
  const person = request && requested ? requested : last?.person;
  const open = Boolean(request && requested);
  const personId = person?.id;
  const short = person ? person.nickname || person.fullName.split(" ")[0] : "";
  const nameOf = (id: string | null) => data.persons.find((p) => p.id === id)?.fullName ?? null;

  // The edit form waits for the whole row when the store has to fetch it.
  const [loaded, setLoaded] = useState<Person | null>(null);
  const loadId = request?.kind === "edit" && store.load ? request.personId : null;
  useEffect(() => {
    if (!loadId || !store.load) return;
    let live = true;
    store.load(loadId).then(
      (p) => live && setLoaded(p),
      (e) => live && setError(message(e)),
    );
    return () => {
      live = false;
    };
  }, [loadId, store]);
  const editDefaults = store.load ? (loaded?.id === personId ? loaded : null) : person;

  // What the person already has, for the choices and warnings the add form shows.
  const unions = person ? data.unions.filter((u) => u.partnerAId === person.id || u.partnerBId === person.id) : [];
  const parentLinks = person ? data.children.filter((c) => c.childId === person.id) : [];
  const bioLink = parentLinks.find((c) => c.relation === "biological");
  const bioUnion = bioLink ? data.unions.find((u) => u.id === bioLink.unionId) : undefined;
  const twoBioParents = Boolean(bioUnion?.partnerBId);
  const noParents = editing?.kind === "add" && editing.relation === "sibling" && !bioLink;
  const linkLabel = (unionId: string) => {
    const u = data.unions.find((x) => x.id === unionId);
    return u ? [nameOf(u.partnerAId), nameOf(u.partnerBId)].filter(Boolean).join(" & ") : "";
  };

  const candidates = useMemo(() => {
    const n = query.trim().toLowerCase();
    const others = data.persons.filter((p) => p.id !== personId);
    return (n ? others.filter((p) => p.fullName.toLowerCase().includes(n) || p.nickname?.toLowerCase().includes(n)) : others).slice(0, 30);
  }, [data.persons, personId, query]);

  // On wide screens the chart unmounts this form when it switches its sidebar back to the summary; the
  // draft must not outlive it.
  useEffect(() => () => onDraft?.(null), [onDraft]);

  // Report the draft to the chart whenever the form or the choices above change.
  useEffect(() => {
    if (!onDraft) return;
    if (!open || !editing || !person || editing.kind === "delete" || !form) {
      onDraft(null);
      return;
    }
    const fd = new FormData(form);
    const gender = (["male", "female", "unknown"] as const).find((g) => g === fd.get("gender")) ?? "unknown";
    if (editing.kind === "edit") {
      onDraft({ kind: "edit", personId: person.id, name: text(fd, "fullName"), nickname: text(fd, "nickname") || null, gender });
      return;
    }
    // Linking someone: nothing to draw until they are picked.
    if (source === "existing" && !picked) {
      onDraft(null);
      return;
    }
    const relation: RelationSpec = { kind: editing.relation, ofId: person.id };
    if (editing.relation === "child") relation.unionId = text(fd, "relUnion") || null;
    if (editing.relation === "partner") relation.unionStatus = (text(fd, "unionStatus") || "married") as UnionStatus;
    else relation.childRelation = (text(fd, "childRelation") || "biological") as ChildRelation;
    const order = Number(text(fd, "birthOrder"));
    if (Number.isInteger(order) && order > 0) relation.birthOrder = order;
    const name = text(fd, "fullName") || `${RELATION_TITLE[editing.relation][0].toUpperCase()}${RELATION_TITLE[editing.relation].slice(1)} ${short}`;
    onDraft({ kind: "add", relation, name, gender: gender as Gender, existingId: source === "existing" ? picked : null });
  }, [onDraft, form, open, editing, person, short, source, picked, typed, editDefaults]);

  function reset() {
    setError(null);
    setConflict(false);
    setSource("new");
    setQuery("");
    setPicked("");
    // A row fetched before a save is stale: its updatedAt would flag the next edit as a conflict.
    setLoaded(null);
  }

  function close() {
    reset();
    onEditingChange(null);
  }

  async function save(work: () => Promise<string | void>, done: string) {
    setPending(true);
    setError(null);
    try {
      const addedId = await work();
      await store.onSaved?.();
      if (addedId) {
        // `ditambah` makes the chart select the person and re-centre if the view can't show them. Read at
        // save time: the chart owns the query (focus, direction) and may have changed it since render.
        const sp = new URLSearchParams(window.location.search);
        sp.set("ditambah", addedId);
        router.replace(`${window.location.pathname}?${sp}`, { scroll: false });
      }
      toast.success(done);
      close();
    } catch (e) {
      if (e instanceof ConflictError) setConflict(true);
      setError(message(e));
    } finally {
      setPending(false);
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing || !person) return;
    const fd = new FormData(e.currentTarget);
    const name = text(fd, "fullName");
    if (editing.kind === "delete") void save(() => store.remove(person.id), `${person.fullName} dihapus.`);
    else if (editing.kind === "edit") void save(() => store.update(person.id, fd), `${name} disimpan.`);
    else if (source === "existing") void save(() => store.add(fd), `${nameOf(picked)} dihubungkan dengan ${person.fullName}.`);
    else void save(() => store.add(fd), `${name} ditambahkan.`);
  }

  // The sidebar is not a dialog, so nothing moves focus into it: do it here, once per opening.
  useEffect(() => {
    if (open && isWide) titleRef.current?.focus({ preventScroll: true });
  }, [open, isWide, editing?.kind, personId]);

  const errorAlert = error ? (
    <Alert variant={conflict ? "warning" : "destructive"}>
      <AlertDescription className={conflict ? "text-foreground" : undefined}>{error}</AlertDescription>
    </Alert>
  ) : null;

  if (editing?.kind === "delete") {
    return (
      // An alert, like every other destructive confirmation in the app (ConfirmButton).
      <AlertDialog open={open} onOpenChange={(o) => (o ? null : close())}>
        <AlertDialogContent>
          <form onSubmit={submit} className="contents">
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus {person?.fullName}?</AlertDialogTitle>
              <AlertDialogDescription>{store.deleteNote}</AlertDialogDescription>
            </AlertDialogHeader>
            {errorAlert}
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction type="submit" variant="destructive" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const adding = editing?.kind === "add" ? editing : null;
  const title = adding ? `Tambah ${RELATION_TITLE[adding.relation]} ${short}` : `Ubah ${short}`;
  const ordered = adding && (adding.relation === "child" || adding.relation === "sibling");

  const body = (
    // The form is the scroller, so its bar can float over the fields as a material with a scroll edge.
    <form
      ref={setForm}
      key={`${editing?.kind}-${adding?.relation}-${personId}`}
      onSubmit={submit}
      onInput={() => setTyped((n) => n + 1)}
      onChange={() => setTyped((n) => n + 1)}
      className="panel-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
    >
      {/* An iOS sheet's bar: Cancel on the left, the one action on the right, the title between. */}
      <div className={cn("panel-bar material sticky top-0 z-10", sheetBar)}>
        <Button type="button" variant="ghost" className={barCancel} onClick={close}>
          Batal
        </Button>
        {/* Focus starts on the title, not on Batal: nothing is pre-selected, and screen readers hear where they are. */}
        <h2 ref={titleRef} id={titleId} tabIndex={-1} className="max-w-[14rem] truncate text-center text-[17px] font-semibold tracking-[-0.01em] outline-none">
          {title}
        </h2>
        <Button
          type="submit"
          variant="ghost"
          className={barConfirm}
          disabled={pending || noParents || (editing?.kind === "edit" && !editDefaults) || (source === "existing" && !picked)}
        >
          {pending ? <Spinner /> : conflict ? "Timpa" : source === "existing" ? "Hubungkan" : "Simpan"}
        </Button>
      </div>

      {/* minmax(0, 1fr): a wide field must not stretch the panel past its edge. */}
      <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-6 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {adding && person ? (
          <>
            <input type="hidden" name="relKind" value={adding.relation} />
            <input type="hidden" name="relOf" value={person.id} />
            {source === "existing" ? <input type="hidden" name="existingId" value={picked} /> : null}
          </>
        ) : null}

        {noParents ? (
          <Alert>
            <AlertDescription>Orang tua {short} belum tercatat. Tambahkan orang tuanya dulu, lalu saudaranya bisa dihubungkan.</AlertDescription>
          </Alert>
        ) : null}

        {/* How the new person hangs off this one comes first, then who they are. */}
        {adding && !noParents ? (
          <FormGroup
            title="Hubungan"
            footer={
              adding.relation === "parent" && twoBioParents
                ? `${short} sudah punya dua orang tua kandung, jadi orang tua ini dicatat sebagai orang tua kedua (angkat atau tiri).`
                : ordered
                  ? "Kosongkan “Anak ke-” bila ia paling bungsu. Saudara sesudahnya ikut bergeser."
                  : undefined
            }
          >
            {adding.relation === "child" && unions.length > 0 ? (
              <FormRow label="Orang tua lain" htmlFor="dialog-relUnion">
                <RowSelect id="dialog-relUnion" name="relUnion" defaultValue={unions[0].id}>
                  {unions.map((u) => {
                    const partner = nameOf(u.partnerAId === person?.id ? u.partnerBId : u.partnerAId);
                    return (
                      <option key={u.id} value={u.id}>
                        {partner ?? "Tidak diketahui"}
                      </option>
                    );
                  })}
                  {unions.every((u) => u.partnerBId) ? <option value="">Tidak diketahui</option> : null}
                </RowSelect>
              </FormRow>
            ) : null}

            {adding.relation === "partner" ? (
              <FormRow label="Status" htmlFor="dialog-unionStatus">
                <RowSelect id="dialog-unionStatus" name="unionStatus" defaultValue="married">
                  <option value="married">Menikah</option>
                  <option value="divorced">Bercerai (mantan)</option>
                  <option value="widowed">Salah satu wafat</option>
                  <option value="unknown">Tidak diketahui</option>
                </RowSelect>
              </FormRow>
            ) : (
              <FormRow label={adding.relation === "parent" ? "Sebagai orang tua" : "Hubungan anak"} htmlFor="dialog-childRelation">
                <RowSelect id="dialog-childRelation" name="childRelation" defaultValue={adding.relation === "parent" && twoBioParents ? "adopted" : "biological"}>
                  <option value="biological" disabled={adding.relation === "parent" && twoBioParents}>
                    Kandung
                  </option>
                  <option value="adopted">Angkat</option>
                  <option value="step">Tiri</option>
                </RowSelect>
              </FormRow>
            )}

            {ordered ? (
              <FormRow label="Anak ke-" htmlFor="dialog-birthOrder">
                <input id="dialog-birthOrder" name="birthOrder" inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" placeholder="Paling bungsu" className={rowInput} />
              </FormRow>
            ) : null}
          </FormGroup>
        ) : null}

        {adding && !noParents ? (
          <SegmentedControl
            label="Siapa yang ditambahkan"
            value={source}
            onChange={setSource}
            options={[
              ["new", "Orang baru"],
              ["existing", "Sudah ada di pohon"],
            ]}
          />
        ) : null}

        {adding && !noParents && source === "existing" ? (
          <PersonPicker
            items={candidates.map((c) => ({ id: c.id, name: c.fullName, nickname: c.nickname, birthYear: c.birthDate && c.birthPrecision !== "unknown" ? c.birthDate.slice(0, 4) : null }))}
            query={query}
            onQuery={setQuery}
            picked={picked}
            onPick={setPicked}
          />
        ) : null}

        {adding && !noParents && source === "new" ? <PersonFields idPrefix="dialog-new" /> : null}

        {editing?.kind === "edit" ? (
          editDefaults ? (
            <>
              <input type="hidden" name="updatedAt" value={editDefaults.updatedAt} />
              {conflict ? <input type="hidden" name="force" value="1" /> : null}
              <PersonFields idPrefix="dialog-edit" defaults={editDefaults} />
              {parentLinks.length > 0 ? (
                <FormGroup title="Urutan lahir">
                  {parentLinks.map((link) => (
                    <FormRow key={link.unionId} label={parentLinks.length > 1 ? `Anak ke- (${linkLabel(link.unionId)})` : "Anak ke-"} htmlFor={`dialog-order-${link.unionId}`}>
                      <input type="hidden" name={`orderRel:${link.unionId}`} value={link.relation} />
                      <input type="hidden" name={`orderWas:${link.unionId}`} value={link.birthOrder ?? ""} />
                      <input
                        id={`dialog-order-${link.unionId}`}
                        name={`order:${link.unionId}`}
                        defaultValue={link.birthOrder ?? ""}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        autoComplete="off"
                        placeholder="Tidak diketahui"
                        className={rowInput}
                      />
                    </FormRow>
                  ))}
                </FormGroup>
              ) : null}
            </>
          ) : !error ? (
            <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Spinner /> Memuat data…
            </p>
          ) : null
        ) : null}

        {errorAlert}

        {/* As in Contacts: deleting is its own group at the end of the edit form, away from Save, and asks
            first. It waits for the person's data, so it never shows under "Memuat data…". */}
        {editing?.kind === "edit" && person && editDefaults ? (
          <FormGroup>
            <button type="button" onClick={() => (setError(null), setConflict(false), onEditingChange({ kind: "delete", personId: person.id }))} className={destructiveRow}>
              <Trash2Icon className="size-[18px]" /> Hapus
            </button>
          </FormGroup>
        ) : null}
      </div>
    </form>
  );

  // Wide screens: the chart puts this into its right-hand inspector, in place of the person's summary.
  if (isWide) {
    return open ? (
      <div className="flex min-h-0 flex-1 flex-col" onKeyDown={(e) => (e.key === "Escape" ? close() : null)}>
        {body}
      </div>
    ) : null;
  }
  // Phones: a sheet from the bottom, as on iOS; Base UI plays it out the same way it came in.
  return (
    <Sheet open={open} onOpenChange={(o) => (o ? null : close())}>
      <SheetContent side="bottom" showCloseButton={false} initialFocus={titleRef} aria-labelledby={titleId} className="mx-auto max-h-[88dvh] w-full max-w-lg gap-0 overflow-hidden rounded-t-3xl bg-grouped p-0">
        {body}
      </SheetContent>
    </Sheet>
  );
}
