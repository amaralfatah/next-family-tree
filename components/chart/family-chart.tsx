"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import {
  ArrowDownFromLineIcon,
  ArrowUpFromLineIcon,
  BabyIcon,
  CrosshairIcon,
  DownloadIcon,
  ExternalLinkIcon,
  HeartIcon,
  LoaderIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  UserRoundPlusIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setRootAction } from "@/lib/actions";
import { autoCollapse, buildAncestorGraph, buildDescendantGraph, type FamilyGraph } from "@/lib/graph/build";
import { toElk } from "@/lib/graph/layout";
import { useElkLayout } from "@/lib/graph/use-layout";
import { describeKinship } from "@/lib/kinship";
import { photoUrl, subtitle } from "@/lib/person";
import type { Person, TreeData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { nodeTypes, type PersonNodeData } from "./nodes";

type Mode = "keturunan" | "leluhur";
type RelationKind = (typeof QUICK_ADD)[number]["rel"];

/** In-browser edits for the /demo sandbox: the sheet opens local dialogs instead of profile pages. */
export interface SandboxActions {
  onAdd: (relation: RelationKind, personId: string) => void;
  onEdit: (personId: string) => void;
  onDelete: (personId: string) => void;
  onMakeRoot: (personId: string) => Promise<void>;
}

interface Props {
  treeId: string;
  treeName: string;
  data: TreeData;
  rootPersonId: string | null;
  mePersonId: string | null;
  canEdit: boolean;
  /** Public sample on /contoh: read-only, no profile links, and the sheet invites the visitor to sign up. */
  demo?: boolean;
  /** Person whose sheet is open on first render. */
  initialSelectedId?: string;
  sandbox?: SandboxActions;
}

export function FamilyChart(props: Props) {
  return (
    <ReactFlowProvider>
      <Chart {...props} />
    </ReactFlowProvider>
  );
}

function Chart({ treeId, treeName, data, rootPersonId, mePersonId, canEdit, demo = false, initialSelectedId, sandbox }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const byId = useMemo(() => new Map(data.persons.map((p) => [p.id, p])), [data.persons]);

  const fallbackFocus = rootPersonId && byId.has(rootPersonId) ? rootPersonId : (data.persons[0]?.id ?? null);
  const paramFocus = searchParams.get("pusat");
  const focusId = paramFocus && byId.has(paramFocus) ? paramFocus : fallbackFocus;
  const mode: Mode = searchParams.get("arah") === "leluhur" ? "leluhur" : "keturunan";

  const setView = useCallback(
    (next: { focus?: string; mode?: Mode }) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (next.focus) sp.set("pusat", next.focus);
      if (next.mode) sp.set("arah", next.mode);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Collapsed branches, reset whenever the focus or direction changes.
  const viewKey = `${mode}:${focusId}`;
  const [collapsedState, setCollapsedState] = useState<{ key: string; set: Set<string> } | null>(null);
  const collapsed = useMemo(() => {
    if (collapsedState?.key === viewKey) return collapsedState.set;
    return focusId && mode === "keturunan" ? autoCollapse(data, focusId) : new Set<string>();
  }, [collapsedState, viewKey, data, focusId, mode]);

  const toggle = useCallback(
    (personId: string) => {
      const next = new Set(collapsed);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      setCollapsedState({ key: viewKey, set: next });
    },
    [collapsed, viewKey],
  );

  const graph: FamilyGraph = useMemo(() => {
    if (!focusId) return { nodes: [], edges: [] };
    return mode === "keturunan" ? buildDescendantGraph(data, focusId, collapsed) : buildAncestorGraph(data, focusId, collapsed);
  }, [data, focusId, mode, collapsed]);

  const layoutKey = useMemo(
    () => `${viewKey}|${[...collapsed].sort().join(",")}|${data.persons.length}|${data.unions.length}|${data.children.length}|${graph.nodes.length}`,
    [viewKey, collapsed, data, graph.nodes.length],
  );
  const elkGraph = useMemo(() => toElk(graph), [graph]);
  const { positions, stale } = useElkLayout(elkGraph, layoutKey);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);

  const selected = selectedId ? byId.get(selectedId) : undefined;
  const kinship = useMemo(
    () => (selected && mePersonId && selected.id !== mePersonId ? describeKinship(data, mePersonId, selected.id) : null),
    [selected, mePersonId, data],
  );

  // The chain of people (and the unions between them) from me to the selected person,
  // drawn in soga on the chart: the "how are we related" answer, made visible.
  const path = useMemo(() => {
    const persons = new Set(kinship?.path ?? []);
    const unions = new Set<string>();
    const ids = kinship?.path ?? [];
    for (let i = 1; i < ids.length; i++) {
      const [a, b] = [ids[i - 1], ids[i]];
      for (const u of data.unions) {
        const partners = [u.partnerAId, u.partnerBId];
        const kids = data.children.filter((c) => c.unionId === u.id).map((c) => c.childId);
        const linked =
          (partners.includes(a) && (kids.includes(b) || partners.includes(b))) || (partners.includes(b) && kids.includes(a));
        if (linked) unions.add(u.id);
      }
    }
    return { persons, unions };
  }, [kinship, data.unions, data.children]);

  const nodes: Node[] = useMemo(() => {
    if (!positions) return [];
    return graph.nodes
      .filter((n) => positions[n.id])
      .map((n): Node => {
        const position = positions[n.id];
        if (n.kind === "person") {
          const person = byId.get(n.personId)!;
          const nodeData: PersonNodeData = {
            person,
            photo: photoUrl(treeId, person),
            focus: n.focus,
            isMe: n.personId === mePersonId,
            hiddenCount: n.hiddenCount,
            collapsible: n.collapsible,
            collapsed: collapsed.has(n.personId),
            direction: mode === "keturunan" ? "down" : "up",
            onToggle: toggle,
            onPath: path.persons.has(n.personId),
            isSelected: selectedId === n.personId,
          };
          return { id: n.id, type: "person", position, data: nodeData };
        }
        if (n.kind === "union") return { id: n.id, type: "union", position, data: { status: n.status, onPath: path.unions.has(n.unionId) }, selectable: false };
        return { id: n.id, type: "unknown", position, data: {}, selectable: false };
      });
  }, [positions, graph.nodes, byId, treeId, mePersonId, collapsed, mode, toggle, selectedId, path]);

  const edges: Edge[] = useMemo(
    () =>
      graph.edges.map((e) => {
        const unionEnd = e.source.startsWith("u:") ? e.source.slice(2) : e.target.startsWith("u:") ? e.target.slice(2) : null;
        const personEnd = e.source.startsWith("p:") ? e.source.slice(2) : e.target.startsWith("p:") ? e.target.slice(2) : null;
        const onPath = Boolean(unionEnd && personEnd && path.unions.has(unionEnd) && path.persons.has(personEnd));
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          pathOptions: { borderRadius: 10 },
          selectable: false,
          focusable: false,
          zIndex: onPath ? 1 : 0,
          style: {
            ...(e.relation === "adopted" ? { strokeDasharray: "6 4" } : e.relation === "step" ? { strokeDasharray: "2 4" } : {}),
            ...(onPath ? { stroke: "var(--soga)", strokeWidth: 3 } : {}),
          },
        };
      }),
    [graph.edges, path],
  );

  const { fitView, setCenter, getZoom } = useReactFlow();
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!positions || stale || fittedFor.current === viewKey) return;
    fittedFor.current = viewKey;
    requestAnimationFrame(() => {
      // Phones always open on the focus person at a readable zoom (names stay around 13px) instead of
      // shrinking the whole tree to fit; the rest is a pan away.
      const narrow = window.innerWidth < 640;
      const p = focusId ? positions[`p:${focusId}`] : undefined;
      if (p && (narrow || graph.nodes.length > 60)) {
        setCenter(p.x + 98, p.y + (narrow ? 200 : 180), { zoom: narrow ? 0.95 : 0.85, duration: 0 });
      } else {
        fitView({ padding: 0.15, maxZoom: 1.1, duration: 0 }).then(() => {
          // A wide branch fitted to the screen is too small to read: show "Saya" (or the focus) at a readable zoom instead.
          const target = (mePersonId && positions[`p:${mePersonId}`]) || p;
          if (target && getZoom() < 0.7) setCenter(target.x + 98, target.y + 36, { zoom: 0.85, duration: 0 });
        });
      }
    });
  }, [positions, stale, viewKey, fitView, setCenter, getZoom, graph.nodes.length, focusId, mePersonId]);


  const [savingRoot, startRoot] = useTransition();
  const [exporting, setExporting] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);

  async function doExport(kind: "png" | "pdf" | "svg", paper?: "a4" | "a3" | "a2" | "a1") {
    if (!positions) return;
    setExporting(true);
    try {
      const { exportChart } = await import("./export");
      await exportChart({ kind, paper, graph, positions, persons: byId, mePersonId, title: treeName, fileName: slug(treeName) });
      toast.success("Bagan diunduh.");
    } catch (e) {
      console.error(e);
      toast.error("Ekspor gagal. Coba lipat sebagian cabang lalu ulangi.");
    } finally {
      setExporting(false);
    }
  }

  if (!focusId) {
    return <p className="p-8 text-center text-muted-foreground">Belum ada orang di pohon ini.</p>;
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="no-print absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 p-3">
        <div className="flex rounded-lg border bg-card p-0.5 shadow-sm" role="group" aria-label="Arah bagan">
          {(
            [
              ["keturunan", "Keturunan", ArrowDownFromLineIcon],
              ["leluhur", "Leluhur", ArrowUpFromLineIcon],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setView({ mode: value })}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
                mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
        <FocusSearch data={data} onPick={(id) => setView({ focus: id })} />
        {mePersonId && mePersonId !== focusId ? (
          <Button variant="outline" size="sm" className="h-8 bg-card shadow-sm" onClick={() => setView({ focus: mePersonId })}>
            <CrosshairIcon data-icon="inline-start" /> Saya
          </Button>
        ) : null}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-8 bg-card shadow-sm" disabled={exporting} />}>
              {exporting ? <LoaderIcon className="animate-spin" /> : <DownloadIcon />} Ekspor
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Gambar</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => doExport("png")}>PNG resolusi tinggi</DropdownMenuItem>
                <DropdownMenuItem onClick={() => doExport("svg")}>SVG (vektor, untuk percetakan)</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>PDF untuk dicetak</DropdownMenuLabel>
                {(["a4", "a3", "a2", "a1"] as const).map((p) => (
                  <DropdownMenuItem key={p} onClick={() => doExport("pdf", p)}>
                    PDF {p.toUpperCase()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div ref={flowRef} className="relative min-h-[60dvh] flex-1" aria-label={`Bagan ${mode} ${byId.get(focusId)?.fullName ?? ""}`}>
        {!positions ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <LoaderIcon className="size-4 animate-spin" /> Menyusun bagan…
            </span>
          </div>
        ) : null}
        <div className="absolute inset-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          minZoom={0.08}
          maxZoom={2}
          onNodeClick={(_, node) => {
            if (node.type !== "person") return;
            setSelectedId((node.data as PersonNodeData).person.id);
            // On phones the sheet covers the lower half: bring the tapped card into the top half.
            if (window.innerWidth < 640) {
              const zoom = getZoom();
              setCenter(node.position.x + 98, node.position.y + 36 + (window.innerHeight * 0.22) / zoom, { zoom, duration: 280 });
            }
          }}
          onPaneClick={() => setSelectedId(null)}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} className="opacity-50" />
          <Controls showInteractive={false} position="bottom-left" className="no-print !hidden sm:!flex" />
        </ReactFlow>
        </div>
        {stale && positions ? (
          <span className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-card px-3 py-1 text-xs text-muted-foreground shadow">Menyusun ulang…</span>
        ) : null}
      </div>

      {selected ? (
        <PersonSheet
          key={selected.id}
          treeId={treeId}
          person={selected}
          isMe={selected.id === mePersonId}
          kinshipLabel={kinship?.label ?? null}
          meLinked={Boolean(mePersonId)}
          demo={demo}
          isFocus={selected.id === focusId}
          canEdit={canEdit}
          isRoot={selected.id === rootPersonId}
          savingRoot={savingRoot}
          sandbox={sandbox}
          onClose={() => setSelectedId(null)}
          onFocus={() => setView({ focus: selected.id })}
          onMakeRoot={() =>
            startRoot(async () => {
              if (sandbox) {
                await sandbox.onMakeRoot(selected.id);
                return;
              }
              const r = await setRootAction(treeId, selected.id);
              if (r.ok) toast.success(`${selected.fullName} menjadi pusat bawaan bagan.`);
              else toast.error(r.error);
            })
          }
        />
      ) : canEdit && data.persons.length < 4 && focusId ? (
        <StarterGuide treeId={treeId} person={byId.get(focusId)!} onAdd={sandbox?.onAdd} />
      ) : null}
    </div>
  );
}

function FocusSearch({ data, onPick }: { data: TreeData; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return data.persons
      .filter((p) => p.fullName.toLowerCase().includes(needle) || p.nickname?.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q, data.persons]);
  return (
    <div className="relative order-last w-full sm:order-none sm:w-auto">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) {
            onPick(results[0].id);
            setQ("");
            setOpen(false);
          }
        }}
        placeholder="Cari & pusatkan…"
        aria-label="Cari orang untuk dijadikan pusat bagan"
        className="h-9 w-full rounded-lg border bg-card pr-2 pl-8 text-base shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-8 sm:w-56 sm:text-sm"
      />
      {open && results.length > 0 ? (
        <ul className="absolute top-10 left-0 z-30 w-full overflow-hidden sm:top-9 sm:w-72 rounded-lg border bg-popover py-1 shadow-lg">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(p.id);
                  setQ("");
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">{p.fullName}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">{subtitle(p)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function slug(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "silsilah"
  );
}

const QUICK_ADD = [
  { rel: "parent", label: "Orang tua", icon: UserRoundPlusIcon },
  { rel: "partner", label: "Pasangan", icon: HeartIcon },
  { rel: "child", label: "Anak", icon: BabyIcon },
  { rel: "sibling", label: "Saudara", icon: UsersRoundIcon },
] as const;

const quickAddClass =
  "flex flex-col items-center gap-1 rounded-xl border border-dashed px-1 py-2 text-xs font-medium text-muted-foreground transition-[color,border-color,background-color,transform] duration-150 hover:border-soga hover:bg-accent/60 hover:text-foreground active:scale-[0.97]";

function QuickAdd({ treeId, personId, onAdd }: { treeId: string; personId: string; onAdd?: SandboxActions["onAdd"] }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {QUICK_ADD.map((a) =>
        onAdd ? (
          <button key={a.rel} type="button" onClick={() => onAdd(a.rel, personId)} className={quickAddClass}>
            <a.icon className="size-4 text-soga-ink" />
            {a.label}
          </button>
        ) : (
          <Link key={a.rel} href={`/pohon/${treeId}/orang/baru?rel=${a.rel}&dari=${personId}`} className={quickAddClass}>
            <a.icon className="size-4 text-soga-ink" />
            {a.label}
          </Link>
        ),
      )}
    </div>
  );
}

/** Bottom sheet on phones, floating card on larger screens. */
function PersonSheet(props: {
  treeId: string;
  person: Person;
  isMe: boolean;
  kinshipLabel: string | null;
  meLinked: boolean;
  demo: boolean;
  isFocus: boolean;
  canEdit: boolean;
  isRoot: boolean;
  savingRoot: boolean;
  sandbox?: SandboxActions;
  onClose: () => void;
  onFocus: () => void;
  onMakeRoot: () => void;
}) {
  const { treeId, person, isMe, kinshipLabel, meLinked, demo, isFocus, canEdit, isRoot, savingRoot, sandbox, onClose, onFocus, onMakeRoot } = props;
  return (
    <aside
      className="sheet-in no-print absolute inset-x-0 bottom-0 z-20 rounded-t-3xl border-t bg-popover px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(0_0_0/0.12)] sm:inset-x-auto sm:right-3 sm:bottom-3 sm:w-96 sm:rounded-2xl sm:border sm:pt-4 sm:pb-4 sm:shadow-lg"
      aria-label={`Ringkasan ${person.fullName}`}
    >
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
      <button type="button" onClick={onClose} className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Tutup">
        <XIcon className="size-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight">{person.fullName}</p>
          <p className="text-sm text-muted-foreground">{subtitle(person) || "Tanggal tidak diketahui"}</p>
        </div>
      </div>
      {isMe ? (
        <p className="mt-3 inline-flex rounded-full bg-accent px-3 py-1 text-sm font-medium text-soga-ink">Ini Anda</p>
      ) : kinshipLabel ? (
        <div className="mt-3 rounded-xl bg-accent/70 px-3 py-2">
          <p className="text-xs text-muted-foreground">Hubungan dengan Anda</p>
          <p className="font-display text-xl leading-tight text-soga-ink">{kinshipLabel}</p>
        </div>
      ) : !meLinked ? (
        <p className="mt-3 text-xs text-muted-foreground">Tandai diri Anda di pohon untuk melihat hubungan dengan setiap kerabat.</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {sandbox ? (
          <>
            <Button size="lg" className="h-9" onClick={() => sandbox.onEdit(person.id)}>
              <PencilIcon data-icon="inline-start" /> Ubah
            </Button>
            <Button variant="ghost" size="lg" className="h-9 text-destructive hover:text-destructive" onClick={() => sandbox.onDelete(person.id)}>
              <Trash2Icon data-icon="inline-start" /> Hapus
            </Button>
          </>
        ) : demo ? (
          <Link href="/masuk" className={buttonVariants({ size: "lg", className: "h-9" })}>
            Buat pohon keluarga Anda
          </Link>
        ) : (
          <Link href={`/pohon/${treeId}/orang/${person.id}`} className={buttonVariants({ size: "lg", className: "h-9" })}>
            <ExternalLinkIcon data-icon="inline-start" /> Buka profil
          </Link>
        )}
        {!isFocus ? (
          <Button variant="outline" size="lg" className="h-9" onClick={onFocus}>
            <CrosshairIcon data-icon="inline-start" /> Jadikan pusat
          </Button>
        ) : null}
        {canEdit && !isRoot ? (
          <Button variant="ghost" size="lg" className="h-9" disabled={savingRoot} onClick={onMakeRoot}>
            Pusat bawaan
          </Button>
        ) : null}
      </div>
      {canEdit ? (
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Tambah kerabat {person.nickname || person.fullName.split(" ")[0]}</p>
          <QuickAdd treeId={treeId} personId={person.id} onAdd={sandbox?.onAdd} />
        </div>
      ) : null}
    </aside>
  );
}

/** Shown on a near-empty tree: the next step is always one tap away. */
function StarterGuide({ treeId, person, onAdd }: { treeId: string; person: Person; onAdd?: SandboxActions["onAdd"] }) {
  return (
    <aside className="sheet-in no-print absolute inset-x-3 bottom-3 z-10 mx-auto max-w-md rounded-2xl border bg-popover p-4 shadow-lg sm:right-3 sm:left-auto sm:w-96">
      <p className="font-display text-xl leading-tight">Lanjutkan dari {person.nickname || person.fullName}</p>
      <p className="mt-1 text-sm text-muted-foreground">Tambahkan kerabat terdekatnya. Setiap orang baru langsung tersambung di bagan.</p>
      <div className="mt-3">
        <QuickAdd treeId={treeId} personId={person.id} onAdd={onAdd} />
      </div>
    </aside>
  );
}
