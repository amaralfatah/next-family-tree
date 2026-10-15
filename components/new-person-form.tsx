"use client";

import { useMemo, useState } from "react";
import { PersonFields } from "@/components/person-fields";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";
import { Label } from "@/components/ui/label";
import { createPersonAction } from "@/lib/actions";
import type { RelationKind } from "@/lib/tree/service";
import type { ChildRelation } from "@/lib/types";
import { cn } from "@/lib/utils";

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
          <section className="grid gap-4 rounded-2xl border bg-card p-5">
            {relation === "child" ? (
              <div className="space-y-1.5">
                <Label htmlFor="relUnion">Dari ikatan</Label>
                <select id="relUnion" name="relUnion" defaultValue={defaultUnionId} className="field">
                  {unions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                  {!unions.some((u) => u.label === "Pasangan tidak diketahui") ? <option value="">Pasangan tidak diketahui</option> : null}
                </select>
              </div>
            ) : null}
            {relation === "partner" ? (
              <div className="space-y-1.5">
                <Label htmlFor="unionStatus">Status ikatan</Label>
                <select id="unionStatus" name="unionStatus" defaultValue="married" className="field">
                  <option value="married">Menikah</option>
                  <option value="divorced">Bercerai</option>
                  <option value="widowed">Salah satu wafat</option>
                  <option value="unknown">Tidak diketahui</option>
                </select>
              </div>
            ) : null}
            {relation !== "partner" ? (
              <div className="space-y-1.5">
                <Label htmlFor="childRelation">{relation === "parent" ? `Hubungan ${ofName} dengan orang tua ini` : "Jenis hubungan anak"}</Label>
                <select id="childRelation" name="childRelation" defaultValue={defaultChildRelation} className="field">
                  <option value="biological">Kandung</option>
                  <option value="adopted">Angkat</option>
                  <option value="step">Tiri</option>
                </select>
              </div>
            ) : null}

            <div className="flex rounded-lg border p-0.5" role="radiogroup" aria-label="Sumber data">
              {(
                [
                  ["new", "Orang baru"],
                  ["existing", "Sudah ada di pohon"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={mode === v}
                  onClick={() => setMode(v)}
                  className={cn("h-8 flex-1 rounded-md text-sm transition-colors", mode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {mode === "existing" ? (
        <section className="grid gap-3 rounded-2xl border bg-card p-5">
          <input type="hidden" name="existingId" value={picked} />
          <Label htmlFor="pick-q">Pilih orang</Label>
          <input
            id="pick-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ketik nama…"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
          />
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
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <PersonFields idPrefix="new" />
        </section>
      )}

      {state && !state.ok ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex justify-end gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button type="submit" size="lg" className="h-11 px-6" disabled={pending || (mode === "existing" && !picked)}>
          {pending ? "Menyimpan…" : mode === "existing" ? "Hubungkan" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
