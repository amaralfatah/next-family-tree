"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { FamilyChart, type SandboxActions } from "@/components/chart/family-chart";
import { PersonFields } from "@/components/person-fields";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Mark, Wordmark } from "@/components/wordmark";
import { AccessError } from "@/lib/access";
import type { DB } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { createDemoTree, demoView } from "@/lib/demo";
import { UserError } from "@/lib/errors";
import { parsePerson } from "@/lib/person-form";
import { createPerson, deletePerson, getTree, loadTreeData, setRootPerson, updatePerson, type RelationKind, type RelationSpec } from "@/lib/tree/service";
import type { TreeData, UnionStatus } from "@/lib/types";

interface Sandbox {
  db: DB;
  userId: string;
  treeId: string;
}

interface View {
  name: string;
  data: TreeData;
  rootId: string | null;
  meId: string | null;
  initialSelectedId?: string;
}

type Editing = { kind: "add"; relation: RelationKind; ofId: string } | { kind: "edit"; personId: string } | { kind: "delete"; personId: string } | null;

const RELATION_TITLE: Record<RelationKind, string> = { parent: "orang tua", partner: "pasangan", child: "anak", sibling: "saudara" };

/** Builds the fictional family in an in-memory Postgres (PGlite) in the browser and runs the real tree service on it. */
async function boot(migrations: string[]): Promise<{ sandbox: Sandbox; view: View }> {
  const [{ PGlite }, { drizzle }] = await Promise.all([import("@electric-sql/pglite"), import("drizzle-orm/pglite")]);
  const client = new PGlite();
  for (const sql of migrations) await client.exec(sql);
  const db = drizzle({ client, schema }) as unknown as DB;
  const [user] = await db.insert(schema.users).values({ name: "Pengunjung", email: "demo@sararia.invalid" }).returning({ id: schema.users.id });
  const treeId = await createDemoTree(db, user.id);
  const data = await loadTreeData(db, user.id, treeId);
  const { focusId, meId, relativeId } = demoView(data);
  await setRootPerson(db, user.id, treeId, focusId);
  const { tree } = await getTree(db, user.id, treeId);
  return { sandbox: { db, userId: user.id, treeId }, view: { name: tree.name, data, rootId: focusId, meId, initialSelectedId: relativeId } };
}

/** Same rule as the server actions: only known errors carry a message meant for the user. */
function message(e: unknown) {
  if (e instanceof UserError || e instanceof AccessError) return e.message;
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Data tidak valid.";
  return "Terjadi kesalahan.";
}

export function DemoSandbox({ migrations }: { migrations: string[] }) {
  const [sandbox, setSandbox] = useState<Sandbox | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [failed, setFailed] = useState(false);
  const [run, setRun] = useState(0);
  const [editing, setEditing] = useState<Editing>(null);
  const started = useRef(-1);

  useEffect(() => {
    if (started.current === run) return;
    started.current = run;
    boot(migrations)
      .then(({ sandbox, view }) => {
        setSandbox(sandbox);
        setView(view);
      })
      .catch((e) => {
        console.error(e);
        setFailed(true);
      });
  }, [migrations, run]);

  const refresh = useCallback(async () => {
    if (!sandbox) return;
    const [{ tree }, data] = await Promise.all([getTree(sandbox.db, sandbox.userId, sandbox.treeId), loadTreeData(sandbox.db, sandbox.userId, sandbox.treeId)]);
    setView((v) => ({
      name: tree.name,
      data,
      rootId: tree.rootPersonId,
      meId: v?.meId && data.persons.some((p) => p.id === v.meId) ? v.meId : null,
    }));
  }, [sandbox]);

  function reset() {
    setSandbox(null);
    setView(null);
    setEditing(null);
    setRun((n) => n + 1);
  }

  const actions: SandboxActions | undefined = sandbox
    ? {
        onAdd: (relation, ofId) => setEditing({ kind: "add", relation, ofId }),
        onEdit: (personId) => setEditing({ kind: "edit", personId }),
        onDelete: (personId) => setEditing({ kind: "delete", personId }),
        onMakeRoot: async (personId) => {
          await setRootPerson(sandbox.db, sandbox.userId, sandbox.treeId, personId);
          await refresh();
          toast.success("Pusat bawaan bagan diubah.");
        },
      }
    : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-30 border-b bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" aria-label="Sararia Family Tree, ke beranda" className="shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Mark className="sm:hidden" />
            <Wordmark className="hidden sm:inline-flex" />
          </Link>
          <span className="min-w-0 flex-1 truncate border-l pl-3 font-display text-lg sm:text-xl">{view?.name ?? "Pohon contoh"}</span>
          <ThemeToggle label="Ganti tema terang/gelap" />
          <Link href="/masuk" className={buttonVariants({ size: "sm", className: "h-8" })}>
            Buat pohon
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <h1 className="sr-only">Coba ubah pohon keluarga contoh</h1>
        <div className="no-print border-b bg-accent/60">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-[13px] sm:py-2.5 sm:text-sm">
            <p className="min-w-0 flex-1">
              <strong className="font-semibold">Mode coba.</strong> Ketuk siapa pun untuk menambah kerabat, mengubah, atau menghapusnya. Perubahan hanya ada di
              browser ini dan hilang saat halaman ditutup.
            </p>
            <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={reset} disabled={!sandbox}>
              Mulai ulang
            </Button>
          </div>
        </div>
        {view && sandbox ? (
          <Suspense>
            <FamilyChart
              key={run}
              treeId="demo"
              treeName={view.name}
              data={view.data}
              rootPersonId={view.rootId}
              mePersonId={view.meId}
              canEdit
              demo
              initialSelectedId={view.initialSelectedId}
              sandbox={actions}
            />
          </Suspense>
        ) : (
          <div className="grid flex-1 place-items-center px-4 text-center">
            {failed ? (
              <div>
                <p className="font-display text-xl">Pohon contoh gagal dimuat.</p>
                <Button variant="outline" className="mt-3" onClick={() => (setFailed(false), reset())}>
                  Coba lagi
                </Button>
              </div>
            ) : (
              <p role="status" className="text-sm text-muted-foreground">
                Menyiapkan keluarga contoh di browser Anda…
              </p>
            )}
          </div>
        )}
      </main>

      {sandbox && view ? <PersonDialog sandbox={sandbox} data={view.data} editing={editing} onClose={() => setEditing(null)} onSaved={refresh} /> : null}
    </div>
  );
}

function PersonDialog({ sandbox, data, editing, onClose, onSaved }: { sandbox: Sandbox; data: TreeData; editing: Editing; onClose: () => void; onSaved: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const personId = editing?.kind === "add" ? editing.ofId : editing?.personId;
  const person = data.persons.find((p) => p.id === personId);
  const short = person ? person.nickname || person.fullName.split(" ")[0] : "";
  const nameOf = (id: string | null) => data.persons.find((p) => p.id === id)?.fullName ?? null;

  async function save(work: () => Promise<unknown>, done: string) {
    setPending(true);
    setError(null);
    try {
      await work();
      await onSaved();
      toast.success(done);
      onClose();
    } catch (e) {
      setError(message(e));
    } finally {
      setPending(false);
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing || !person) return;
    const fd = new FormData(e.currentTarget);
    const { db, userId, treeId } = sandbox;
    if (editing.kind === "delete") {
      void save(() => deletePerson(db, userId, treeId, person.id), `${person.fullName} dihapus.`);
      return;
    }
    let input: ReturnType<typeof parsePerson>;
    try {
      input = parsePerson(fd);
    } catch (err) {
      setError(message(err));
      return;
    }
    if (editing.kind === "edit") {
      void save(() => updatePerson(db, userId, treeId, person.id, input), `${input.fullName} disimpan.`);
      return;
    }
    const relation: RelationSpec = { kind: editing.relation, ofId: person.id };
    if (editing.relation === "child") relation.unionId = (fd.get("relUnion") as string) || null;
    if (editing.relation === "partner") relation.unionStatus = fd.get("unionStatus") as UnionStatus;
    void save(() => createPerson(db, userId, treeId, input, relation), `${input.fullName} ditambahkan.`);
  }

  const unions = person ? data.unions.filter((u) => u.partnerAId === person.id || u.partnerBId === person.id) : [];
  const title =
    editing?.kind === "add" ? `Tambah ${RELATION_TITLE[editing.relation]} ${short}` : editing?.kind === "edit" ? `Ubah ${short}` : `Hapus ${person?.fullName ?? ""}?`;

  return (
    <Dialog open={Boolean(editing && person)} onOpenChange={(open) => (open ? null : (setError(null), onClose()))}>
      <DialogContent className={editing?.kind === "delete" ? undefined : "max-h-[90dvh] overflow-y-auto sm:max-w-xl"}>
        <form key={`${editing?.kind}-${personId}`} onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal">{title}</DialogTitle>
            {editing?.kind === "delete" ? (
              <DialogDescription>Ikatan dan hubungan anak yang hanya melibatkan dia ikut terhapus. Ini hanya di pohon contoh.</DialogDescription>
            ) : null}
          </DialogHeader>
          {editing?.kind === "add" && editing.relation === "child" && unions.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="demo-relUnion">Dari ikatan</Label>
              <select id="demo-relUnion" name="relUnion" defaultValue={unions[0].id} className="field">
                {unions.map((u) => {
                  const partner = nameOf(u.partnerAId === person?.id ? u.partnerBId : u.partnerAId);
                  return (
                    <option key={u.id} value={u.id}>
                      {partner ? `Dengan ${partner}` : "Pasangan tidak diketahui"}
                    </option>
                  );
                })}
                {unions.every((u) => u.partnerBId) ? <option value="">Pasangan tidak diketahui</option> : null}
              </select>
            </div>
          ) : null}
          {editing?.kind === "add" && editing.relation === "partner" ? (
            <div className="space-y-1.5">
              <Label htmlFor="demo-unionStatus">Status ikatan</Label>
              <select id="demo-unionStatus" name="unionStatus" defaultValue="married" className="field">
                <option value="married">Menikah</option>
                <option value="divorced">Bercerai</option>
                <option value="widowed">Salah satu wafat</option>
                <option value="unknown">Tidak diketahui</option>
              </select>
            </div>
          ) : null}
          {editing?.kind === "edit" && person ? <PersonFields idPrefix="demo-edit" defaults={person} /> : null}
          {editing?.kind === "add" ? <PersonFields idPrefix="demo-new" /> : null}
          {error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant={editing?.kind === "delete" ? "destructive" : "default"} disabled={pending}>
              {pending ? "Menyimpan…" : editing?.kind === "delete" ? "Hapus" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
