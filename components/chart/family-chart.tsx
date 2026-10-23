"use client";

import "@xyflow/react/dist/style.css";
import {
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
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  UserRoundPlusIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroupAddon } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { setRootAction } from "@/lib/actions";
import { autoCollapse, buildAncestorGraph, buildDescendantGraph, type FamilyGraph } from "@/lib/graph/build";
import { PERSON_H, PERSON_W, toElk } from "@/lib/graph/layout";
import { useElkLayout } from "@/lib/graph/use-layout";
import { createKinshipResolver } from "@/lib/kinship";
import { photoUrl, subtitle } from "@/lib/person";
import type { Person, TreeData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { nodeTypes, type PersonNodeData } from "./nodes";
import { useSheetMotion } from "./sheet-motion";

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
  const defaultCollapsed = useMemo(
    () => (focusId && mode === "keturunan" ? autoCollapse(data, focusId) : new Set<string>()),
    [data, focusId, mode],
  );
  const collapsed = collapsedState?.key === viewKey ? collapsedState.set : defaultCollapsed;

  // Functional update: toggle keeps its identity across collapses, so memoised nodes don't all re-render.
  const toggle = useCallback(
    (personId: string) =>
      setCollapsedState((prev) => {
        const next = new Set(prev?.key === viewKey ? prev.set : defaultCollapsed);
        if (next.has(personId)) next.delete(personId);
        else next.add(personId);
        return { key: viewKey, set: next };
      }),
    [viewKey, defaultCollapsed],
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
  const sheetRef = useRef<SheetHandle>(null);

  const selected = selectedId ? byId.get(selectedId) : undefined;
  const kinOf = useMemo(() => (mePersonId ? createKinshipResolver(data, mePersonId) : null), [data, mePersonId]);
  const kinship = useMemo(() => (selected && kinOf && selected.id !== mePersonId ? kinOf(selected.id) : null), [selected, kinOf, mePersonId]);

  const childrenOfUnion = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of data.children) m.set(c.unionId, [...(m.get(c.unionId) ?? []), c.childId]);
    return m;
  }, [data.children]);

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
        const kids = childrenOfUnion.get(u.id) ?? [];
        const linked =
          (partners.includes(a) && (kids.includes(b) || partners.includes(b))) || (partners.includes(b) && kids.includes(a));
        if (linked) unions.add(u.id);
      }
    }
    return { persons, unions };
  }, [kinship, data.unions, childrenOfUnion]);

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

  function openNode(node: Node) {
    if (node.type !== "person") return;
    setSelectedId((node.data as PersonNodeData).person.id);
    // On phones the toolbar covers the top and the sheet the lower part: centre the tapped card in the
    // strip still visible between them.
    const chart = flowRef.current;
    if (window.innerWidth < 640 && chart) {
      const zoom = getZoom();
      const height = chart.clientHeight;
      const top = toolbarRef.current?.offsetHeight ?? 0;
      const sheet = Math.min(360, height * 0.5);
      const target = (top + (height - sheet)) / 2;
      setCenter(node.position.x + PERSON_W / 2, node.position.y + PERSON_H / 2 + (height / 2 - target) / zoom, { zoom, duration: 280 });
    }
  }
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!positions || stale || fittedFor.current === viewKey) return;
    fittedFor.current = viewKey;
    requestAnimationFrame(() => {
      // Phones always open on the focus person at a readable zoom (names stay around 13px) instead of
      // shrinking the whole tree to fit; the rest is a pan away.
      const narrow = window.innerWidth < 640;
      const p = focusId ? positions[`p:${focusId}`] : undefined;
      // A relative is already selected (the public example, a shared link): frame the whole route from
      // "Saya" to them, keeping clear of the summary panel on the right.
      // Between the two cards, shifted left by half the summary panel (420px) so neither sits under it,
      // at a zoom (0.6 to 0.9) that fits both cards (196 wide) in the room left of the panel.
      const me = mePersonId ? positions[`p:${mePersonId}`] : undefined;
      const them = selectedId ? positions[`p:${selectedId}`] : undefined;
      const room = window.innerWidth - 420 - 96;
      const span = me && them ? Math.abs(me.x - them.x) + 196 : Infinity;
      if (!narrow && me && them && path.persons.size > 1 && span * 0.6 <= room) {
        const zoom = Math.min(0.9, room / span);
        setCenter((me.x + them.x) / 2 + 98 + 210 / zoom, (me.y + them.y) / 2 + 36, { zoom, duration: 0 });
      } else if (p && (narrow || graph.nodes.length > 60)) {
        setCenter(p.x + 98, p.y + (narrow ? 200 : 180), { zoom: narrow ? 0.95 : 0.85, duration: 0 });
      } else {
        fitView({ padding: 0.15, maxZoom: 1.1, duration: 0 }).then(() => {
          // A wide branch fitted to the screen is too small to read: show "Saya" (or the focus) at a readable zoom instead.
          const target = (mePersonId && positions[`p:${mePersonId}`]) || p;
          if (target && getZoom() < 0.7) setCenter(target.x + 98, target.y + 36, { zoom: 0.85, duration: 0 });
        });
      }
    });
  }, [positions, stale, viewKey, fitView, setCenter, getZoom, graph.nodes.length, focusId, mePersonId, selectedId, path]);


  const [savingRoot, startRoot] = useTransition();
  const [exporting, setExporting] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

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
      {/* Controls float over the chart on their own material, with no bar behind them, so the family runs
          edge to edge (HIG: defer to content). Phones get two rows: direction and actions, then search. */}
      <div ref={toolbarRef} className="no-print pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 p-3 *:pointer-events-auto">
        <div className="material flex rounded-[10px] bg-muted/85 p-0.5 shadow-[0_1px_2px_rgb(0_0_0/0.06)] backdrop-blur-xl" role="group" aria-label="Arah bagan">
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
                "flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm transition-[color,background-color,box-shadow] duration-150",
                mode === value ? "bg-card font-medium text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
        <FocusSearch data={data} onPick={(id) => setView({ focus: id })} />
        {mePersonId && mePersonId !== focusId ? (
          <Button variant="outline" size="sm" className="material border-transparent bg-card/85 shadow-[0_1px_2px_rgb(0_0_0/0.06)] backdrop-blur-xl max-sm:px-2.5" onClick={() => setView({ focus: mePersonId })}>
            <CrosshairIcon data-icon="inline-start" /> <span className="max-sm:sr-only">Saya</span>
          </Button>
        ) : null}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="material border-transparent bg-card/85 shadow-[0_1px_2px_rgb(0_0_0/0.06)] backdrop-blur-xl max-sm:px-2.5" disabled={exporting} />}>
              {exporting ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />} <span className="max-sm:sr-only">Ekspor</span>
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
              <Spinner /> Menyusun bagan…
            </span>
          </div>
        ) : null}
        <div
          className="absolute inset-0"
          onKeyDown={(e) => {
            // React Flow focuses nodes but only opens them on click; Enter/Space do the same for keyboard users.
            if (e.key !== "Enter" && e.key !== " ") return;
            const id = (e.target as HTMLElement).closest<HTMLElement>(".react-flow__node-person")?.dataset.id;
            const node = id ? nodes.find((n) => n.id === id) : undefined;
            if (!node) return;
            e.preventDefault();
            openNode(node);
          }}
        >
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
          onNodeClick={(_, node) => openNode(node)}
          onPaneClick={() => (sheetRef.current ? sheetRef.current.dismiss() : setSelectedId(null))}
        >
          <Controls showInteractive={false} position="bottom-left" className="no-print !hidden sm:!flex" />
        </ReactFlow>
        </div>
        {stale && positions ? (
          <span className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-card px-3 py-1 text-xs text-muted-foreground shadow">Menyusun ulang…</span>
        ) : null}
      </div>

      {selected ? (
        <PersonSheet
          ref={sheetRef}
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

/** Arrow keys move through the matches, Enter or a click makes the person the chart's centre. */
function FocusSearch({ data, onPick }: { data: TreeData; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  return (
    <Combobox<Person>
      items={data.persons}
      value={null}
      inputValue={q}
      onInputValueChange={setQ}
      onValueChange={(p) => {
        if (!p) return;
        onPick(p.id);
        setQ("");
      }}
      itemToStringLabel={(p) => p.fullName}
      itemToStringValue={(p) => p.id}
      filter={(p, query) => {
        const needle = query.trim().toLowerCase();
        return Boolean(needle) && (p.fullName.toLowerCase().includes(needle) || Boolean(p.nickname?.toLowerCase().includes(needle)));
      }}
      limit={8}
      autoHighlight
    >
      <ComboboxInput
        showTrigger={false}
        name="chartSearch"
        autoComplete="off"
        placeholder="Cari & pusatkan…"
        aria-label="Cari orang untuk dijadikan pusat bagan"
        className="material order-last w-full border-transparent bg-card/85 shadow-[0_1px_2px_rgb(0_0_0/0.06)] backdrop-blur-xl sm:order-none sm:w-56"
      >
        <InputGroupAddon align="inline-start">
          <SearchIcon />
        </InputGroupAddon>
      </ComboboxInput>
      <ComboboxContent className="sm:min-w-72">
        <ComboboxEmpty>Tidak ada yang cocok.</ComboboxEmpty>
        <ComboboxList>
          {(p: Person) => (
            <ComboboxItem key={p.id} value={p}>
              <span className="min-w-0 truncate font-medium">{p.fullName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{subtitle(p)}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
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
  "flex flex-col items-center gap-1 rounded-xl border border-dashed px-1 py-2 text-xs font-medium text-muted-foreground transition-[color,border-color,background-color,transform] duration-150 active:duration-0 hover:border-soga hover:bg-accent/60 hover:text-foreground active:scale-[0.97]";

function QuickAdd({ treeId, personId, onAdd }: { treeId: string; personId: string; onAdd?: SandboxActions["onAdd"] }) {
  // Saving returns here with the same focus and direction instead of opening the new profile.
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const back = encodeURIComponent(query ? `${pathname}?${query}` : pathname);
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {QUICK_ADD.map((a) =>
        onAdd ? (
          <button key={a.rel} type="button" onClick={() => onAdd(a.rel, personId)} className={quickAddClass}>
            <a.icon className="size-4 text-soga-ink" />
            {a.label}
          </button>
        ) : (
          <Link key={a.rel} href={`/pohon/${treeId}/orang/baru?rel=${a.rel}&dari=${personId}&kembali=${back}`} className={quickAddClass}>
            <a.icon className="size-4 text-soga-ink" />
            {a.label}
          </Link>
        ),
      )}
    </div>
  );
}

/** Lets the chart close the sheet with the same motion as its close button. */
interface SheetHandle {
  dismiss: () => void;
}

/** Bottom sheet on phones (drag down to close), floating card on larger screens. */
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
  /** Called once the sheet has finished leaving. */
  onClose: () => void;
  onFocus: () => void;
  onMakeRoot: () => void;
  ref?: React.Ref<SheetHandle>;
}) {
  const { treeId, person, isMe, kinshipLabel, meLinked, demo, isFocus, canEdit, isRoot, savingRoot, sandbox, onClose, onFocus, onMakeRoot, ref } = props;
  const { ref: sheetEl, dismiss, handlers } = useSheetMotion<HTMLElement>(onClose);
  useImperativeHandle(ref, () => ({ dismiss }), [dismiss]);
  return (
    <aside
      ref={sheetEl}
      {...handlers}
      className="no-print absolute inset-x-0 bottom-0 z-20 touch-none will-change-transform rounded-t-3xl border-t bg-popover px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(0_0_0/0.12)] sm:inset-x-auto sm:right-3 sm:bottom-3 sm:w-96 sm:rounded-2xl sm:border sm:pt-4 sm:pb-4 sm:shadow-lg"
      aria-label={`Ringkasan ${person.fullName}`}
    >
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
      <button type="button" onClick={dismiss} className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Tutup">
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
        <div className="mt-3 rounded-xl bg-accent px-3.5 py-2.5">
          <p className="text-xs text-muted-foreground">Hubungan dengan Anda</p>
          <p className="font-display text-xl leading-tight text-soga-ink">{kinshipLabel}</p>
        </div>
      ) : !meLinked ? (
        <p className="mt-3 text-xs text-muted-foreground">Tandai diri Anda di pohon untuk melihat hubungan dengan setiap kerabat.</p>
      ) : null}
      {/* Actions share the row evenly, as in an iOS sheet; a third one wraps under them. */}
      <div className="mt-4 flex flex-wrap gap-2 *:min-w-[8.5rem] *:flex-1">
        {sandbox ? (
          <>
            <Button onClick={() => sandbox.onEdit(person.id)}>
              <PencilIcon data-icon="inline-start" /> Ubah
            </Button>
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => sandbox.onDelete(person.id)}>
              <Trash2Icon data-icon="inline-start" /> Hapus
            </Button>
          </>
        ) : demo ? (
          <Link href="/masuk" className={buttonVariants()}>
            Buat pohon Anda
          </Link>
        ) : (
          <Link href={`/pohon/${treeId}/orang/${person.id}`} className={buttonVariants()}>
            <ExternalLinkIcon data-icon="inline-start" /> Buka profil
          </Link>
        )}
        {!isFocus ? (
          <Button variant="outline" onClick={onFocus}>
            <CrosshairIcon data-icon="inline-start" /> Jadikan pusat
          </Button>
        ) : null}
        {canEdit && !isRoot ? (
          <Button variant="ghost" disabled={savingRoot} onClick={onMakeRoot}>
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
