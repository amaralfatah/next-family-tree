"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { navBar } from "@/components/nav-bar";
import type { EditActions } from "@/components/chart/family-chart";
import { PersonDialog, type Editing, type PersonStore } from "@/components/person-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Mark, Wordmark } from "@/components/wordmark";
import type { DB } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { createDemoTree, demoView } from "@/lib/demo";
import { parseBirthOrders, parsePerson, parseRelation } from "@/lib/person-form";
import type { Draft } from "@/lib/tree/draft";
import { createPerson, deletePerson, getTree, linkExisting, loadTreeData, setRootPerson, updateChildLink, updatePerson } from "@/lib/tree/service";
import type { TreeData } from "@/lib/types";

// The chart (React Flow, layout, kinship) only shows once PGlite has booted in the browser, so its
// code loads alongside that instead of in the first paint.
const FamilyChart = dynamic(() => import("@/components/chart/family-chart").then((m) => m.FamilyChart), { ssr: false });

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

export function DemoSandbox({ migrations }: { migrations: string[] }) {
  const [sandbox, setSandbox] = useState<Sandbox | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [failed, setFailed] = useState(false);
  const [run, setRun] = useState(0);
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
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

  // The same dialog as a real tree, saving into the browser's database instead of through the server.
  const store = useMemo<PersonStore | null>(() => {
    if (!sandbox) return null;
    const { db, userId, treeId } = sandbox;
    return {
      add: async (fd) => {
        const relation = parseRelation(fd);
        const existing = fd.get("existingId")?.toString();
        if (!relation || !existing) return createPerson(db, userId, treeId, parsePerson(fd), relation);
        await linkExisting(db, userId, treeId, relation, existing);
        return existing;
      },
      update: async (personId, fd) => {
        const orders = parseBirthOrders(fd);
        await updatePerson(db, userId, treeId, personId, parsePerson(fd));
        for (const o of orders) await updateChildLink(db, userId, treeId, o.unionId, personId, o);
      },
      remove: async (personId) => {
        await deletePerson(db, userId, treeId, personId);
      },
      deleteNote: "Pernikahan dan hubungan anak yang hanya melibatkan dia ikut terhapus. Ini hanya di pohon contoh.",
      onSaved: refresh,
    };
  }, [sandbox, refresh]);

  const actions: EditActions | undefined = sandbox
    ? {
        onAdd: (relation, ofId) => setEditing({ kind: "add", relation, ofId }),
        onEdit: (personId) => setEditing({ kind: "edit", personId }),
        onClose: () => setEditing(null),
      }
    : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className={navBar}>
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" aria-label="Sararia Family Tree, ke beranda" className="flex shrink-0 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
            <Mark className="sm:hidden" />
            <Wordmark className="hidden sm:inline-flex" />
          </Link>
          <span className="min-w-0 flex-1 truncate border-l border-border pl-3 font-display text-lg sm:text-xl">{view?.name ?? "Pohon contoh"}</span>
          <ThemeToggle label="Ganti tema terang/gelap" />
          <Link href="/masuk" className={buttonVariants({ className: "hit" })}>
            Buat pohon
          </Link>
        </div>
      </header>
      <main id="konten" className="flex flex-1 flex-col">
        <h1 className="sr-only">Coba ubah pohon keluarga contoh</h1>
        <div className="no-print border-b bg-paper-2">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-[13px] sm:py-2.5 sm:text-sm">
            <p className="min-w-0 flex-1">
              <strong className="font-semibold">Mode coba.</strong>
              <span className="max-sm:hidden"> Ketuk siapa pun untuk menambah kerabat, mengubah, atau menghapusnya.</span> Perubahan hilang saat halaman
              ditutup.
            </p>
            <Button variant="outline" className="hit shrink-0" onClick={reset} disabled={!sandbox}>
              Mulai ulang
            </Button>
          </div>
        </div>
        {view && sandbox ? (
          <Suspense>
            <FamilyChart
              key={run}
              treeId="demo"
              data={view.data}
              rootPersonId={view.rootId}
              mePersonId={view.meId}
              canEdit
              demo
              initialSelectedId={view.initialSelectedId}
              actions={actions}
              draft={draft}
              panel={store ? <PersonDialog store={store} data={view.data} editing={editing} onEditingChange={setEditing} onDraft={setDraft} /> : null}
              panelOpen={editing?.kind === "add" || editing?.kind === "edit"}
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
    </div>
  );
}
