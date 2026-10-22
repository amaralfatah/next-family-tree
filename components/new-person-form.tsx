"use client";

import { useMemo, useState } from "react";
import { PersonFields } from "@/components/person-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useFormAction } from "@/lib/use-form-action";
import { createPersonAction } from "@/lib/actions";
import type { RelationKind } from "@/lib/tree/service";
import type { ChildRelation } from "@/lib/types";

interface Candidate {
  id: string;
  name: string;
  nickname: string | null;
  birthYear: string | null;
}

export function NewPersonForm({
  treeId,
  relation,
  ofId,
  ofName,
  unions,
  defaultUnionId,
  defaultChildRelation,
  candidates,
}: {
  treeId: string;
  relation: RelationKind | null;
  ofId: string | null;
  ofName: string | null;
  unions: { id: string; label: string }[];
  defaultUnionId: string;
  defaultChildRelation: ChildRelation;
  candidates: Candidate[];
}) {
  const [state, onSubmit, pending] = useFormAction(createPersonAction.bind(null, treeId));
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string>("");
  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (n ? candidates.filter((c) => c.name.toLowerCase().includes(n) || c.nickname?.toLowerCase().includes(n)) : candidates).slice(0, 30);
  }, [q, candidates]);

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-6">
      {relation && ofId ? (
        <>
          <input type="hidden" name="relKind" value={relation} />
          <input type="hidden" name="relOf" value={ofId} />
          <FieldGroup className="gap-4 rounded-2xl bg-card p-5">
            {relation === "child" ? (
              <Field>
                <FieldLabel htmlFor="relUnion">Dari ikatan</FieldLabel>
                <NativeSelect id="relUnion" name="relUnion" defaultValue={defaultUnionId} className="w-full">
                  {unions.map((u) => (
                    <NativeSelectOption key={u.id} value={u.id}>
                      {u.label}
                    </NativeSelectOption>
                  ))}
                  {!unions.some((u) => u.label === "Pasangan tidak diketahui") ? <NativeSelectOption value="">Pasangan tidak diketahui</NativeSelectOption> : null}
                </NativeSelect>
              </Field>
            ) : null}
            {relation === "partner" ? (
              <Field>
                <FieldLabel htmlFor="unionStatus">Status ikatan</FieldLabel>
                <NativeSelect id="unionStatus" name="unionStatus" defaultValue="married" className="w-full">
                  <NativeSelectOption value="married">Menikah</NativeSelectOption>
                  <NativeSelectOption value="divorced">Bercerai</NativeSelectOption>
                  <NativeSelectOption value="widowed">Salah satu wafat</NativeSelectOption>
                  <NativeSelectOption value="unknown">Tidak diketahui</NativeSelectOption>
                </NativeSelect>
              </Field>
            ) : null}
            {relation !== "partner" ? (
              <Field>
                <FieldLabel htmlFor="childRelation">{relation === "parent" ? `Hubungan ${ofName} dengan orang tua ini` : "Jenis hubungan anak"}</FieldLabel>
                <NativeSelect id="childRelation" name="childRelation" defaultValue={defaultChildRelation} className="w-full">
                  <NativeSelectOption value="biological">Kandung</NativeSelectOption>
                  <NativeSelectOption value="adopted">Angkat</NativeSelectOption>
                  <NativeSelectOption value="step">Tiri</NativeSelectOption>
                </NativeSelect>
              </Field>
            ) : null}

            <ToggleGroup
              aria-label="Sumber data"
              variant="outline"
              className="w-full"
              value={[mode]}
              onValueChange={(v: string[]) => {
                if (v[0] === "new" || v[0] === "existing") setMode(v[0]);
              }}
            >
              <ToggleGroupItem value="new" className="flex-1">
                Orang baru
              </ToggleGroupItem>
              <ToggleGroupItem value="existing" className="flex-1">
                Sudah ada di pohon
              </ToggleGroupItem>
            </ToggleGroup>
          </FieldGroup>
        </>
      ) : null}

      {mode === "existing" ? (
        <section className="grid gap-3 rounded-2xl bg-card p-5">
          <input type="hidden" name="existingId" value={picked} />
          <Field>
            <FieldLabel htmlFor="pick-q">Pilih orang</FieldLabel>
            <Input id="pick-q" name="pickQuery" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ketik nama…" />
          </Field>
          <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border" role="listbox" aria-label="Orang di pohon">
            {matches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={picked === c.id}
                  onClick={() => setPicked(c.id)}
                  className={cn("flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted", picked === c.id && "bg-accent")}
                >
                  <span>
                    {c.name}
                    {c.nickname ? <span className="text-muted-foreground"> “{c.nickname}”</span> : null}
                  </span>
                  {c.birthYear ? <span className="text-xs text-muted-foreground">l. {c.birthYear}</span> : null}
                </button>
              </li>
            ))}
            {matches.length === 0 ? <li className="px-3 py-2 text-sm text-muted-foreground">Tidak ditemukan.</li> : null}
          </ul>
        </section>
      ) : (
        <section className="rounded-2xl bg-card p-5 sm:p-6">
          <PersonFields idPrefix="new" />
        </section>
      )}

      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" size="lg" disabled={pending || (mode === "existing" && !picked)}>
          {pending ? "Menyimpan…" : mode === "existing" ? "Hubungkan" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
