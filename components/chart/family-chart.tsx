"use client";

import "@xyflow/react/dist/style.css";
import {
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
} from "@xyflow/react";
import {
  ArrowDownFromLineIcon,
  ArrowUpFromLineIcon,
  BabyIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  CrosshairIcon,
  ExternalLinkIcon,
  HeartIcon,
  SearchIcon,
  UserRoundPlusIcon,
  UsersRoundIcon,
  NetworkIcon,
  XIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { barCancel, barConfirm, sheetBar } from "@/components/form-row-classes";
import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { autoCollapse, buildAncestorGraph, buildDescendantGraph, buildFamilyGraph, familyRoots, indexTree, revealFocus, type FamilyGraph } from "@/lib/graph/build";
import { PERSON_H, PERSON_W, toElk } from "@/lib/graph/layout";
import { useElkLayout } from "@/lib/graph/use-layout";
import { createKinshipResolver, type KinshipLocale } from "@/lib/kinship";
import { DRAFT_ID, withDraft, type Draft } from "@/lib/tree/draft";
import { useWide } from "@/lib/use-wide";
import { photoUrl, subtitle } from "@/lib/person";
import type { Person, TreeData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { initialsOf, nodeTypes, type PersonNodeData, type UnionNodeData } from "./nodes";
import { reducedMotion, useSheetMotion } from "./sheet-motion";

type Mode = "all" | "descendants" | "ancestors";

/** How long the chart glides to a card; Reduce Motion jumps straight there. */
const pan = () => (reducedMotion() ? 0 : 280);
type RelationKind = (typeof QUICK_ADD)[number]["rel"];

/** Edits from the chart itself: the sheet and quick-add buttons open dialogs instead of separate pages. */
export interface EditActions {
  onAdd: (relation: RelationKind, personId: string) => void;
  onEdit: (personId: string) => void;
  /** Closes the open form: tapping another card switches to that person instead of editing on. */
  onClose: () => void;
}

interface Props {
  treeId: string;
  data: TreeData;
  rootPersonId: string | null;
  mePersonId: string | null;
  canEdit: boolean;
  /** Public sample on /example: read-only, no profile links, and the sheet invites the visitor to sign up. */
  demo?: boolean;
  /** Person whose sheet is open on first render. */
  initialSelectedId?: string;
  actions?: EditActions;
  /** An open add/edit form: the chart draws its result (a placeholder card, a new link, a new name) live. */
  draft?: Draft | null;
  /**
   * The add/edit form. On wide screens it takes the place of the person's summary in the inspector on the
   * right while `panelOpen`; otherwise it is rendered outside it (a phone sheet, the delete alert).
   */
  panel?: React.ReactNode;
  panelOpen?: boolean;
}

export function FamilyChart({ data, draft, ...props }: Props) {
  const shown = useMemo(() => withDraft(data, draft ?? null), [data, draft]);
  return (
    <ReactFlowProvider>
      <Chart {...props} data={shown} draft={draft} />
    </ReactFlowProvider>
  );
}

function Chart({ treeId, data, rootPersonId, mePersonId, canEdit, demo = false, initialSelectedId, actions, draft, panel, panelOpen = false }: Props) {
  const t = useTranslations("chart");
  const locale = useLocale() as KinshipLocale;
  const wide = useWide();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const byId = useMemo(() => new Map(data.persons.map((p) => [p.id, p])), [data.persons]);
  const unionById = useMemo(() => new Map(data.unions.map((u) => [u.id, u])), [data.unions]);

  const fallbackFocus = rootPersonId && byId.has(rootPersonId) ? rootPersonId : (data.persons[0]?.id ?? null);
  const paramFocus = searchParams.get("focus");
  const focusId = paramFocus && byId.has(paramFocus) ? paramFocus : fallbackFocus;
  // The whole family by default, so siblings and cousins show without re-centring on a parent first.
  const view = searchParams.get("view");
  const mode: Mode = view === "ancestors" || view === "descendants" ? view : "all";

  const setView = useCallback(
    (next: { focus?: string; mode?: Mode }) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("added");
      if (next.focus) sp.set("focus", next.focus);
      if (next.mode) sp.set("view", next.mode);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Folded families (union ids), remembered per view so switching tabs and back keeps them. Clicking a
  // marriage dot folds its children; big trees start with the deepest families folded so the first
  // render stays fast.
  const viewKey = `${mode}:${focusId}`;
  const [folds, setFolds] = useState<Record<string, ReadonlySet<string>>>({});
  const autoFolded = useMemo(() => {
    if (!focusId || mode === "ancestors") return new Set<string>();
    return autoCollapse(data, mode === "all" ? familyRoots(indexTree(data), focusId) : focusId);
  }, [data, focusId, mode]);
  const collapsed = folds[viewKey] ?? autoFolded;
  // Functional update: toggle keeps its identity across folds, so memoised nodes don't all re-render.
  const toggle = useCallback(
    (unionId: string) =>
      setFolds((prev) => {
        const next = new Set(prev[viewKey] ?? autoFolded);
        if (next.has(unionId)) next.delete(unionId);
        else next.add(unionId);
        return { ...prev, [viewKey]: next };
      }),
    [viewKey, autoFolded],
  );
  const unfoldAll = () => setFolds((prev) => ({ ...prev, [viewKey]: new Set() }));

  const graph: FamilyGraph = useMemo(() => {
    if (!focusId) return { nodes: [], edges: [] };
    if (mode === "all") return buildFamilyGraph(data, focusId, collapsed);
    return mode === "descendants" ? buildDescendantGraph(data, focusId, collapsed) : buildAncestorGraph(data, focusId, collapsed);
  }, [data, focusId, mode, collapsed]);

  // The graph's own shape, in order: a new birth order, a re-sorted sibling or a moved child changes it even
  // when the counts stay the same.
  const layoutKey = useMemo(() => `${viewKey}|${graph.nodes.map((n) => n.id).join(",")}|${graph.edges.map((e) => e.id).join(",")}`, [viewKey, graph]);
  const elkGraph = useMemo(() => toElk(graph), [graph]);
  const { positions, stale } = useElkLayout(elkGraph, layoutKey);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const sheetRef = useRef<SheetHandle>(null);

  // `?added=<id>`: someone was just added from the chart. Select them, and if the current view can't show
  // them (a new parent in the descendant chart, a sibling of the focus), re-centre the descendant chart so it does.
  const addedId = searchParams.get("added");
  const [revealId, setRevealId] = useState<string | null>(null);
  if (addedId && addedId !== revealId && byId.has(addedId)) {
    setRevealId(addedId);
    setSelectedId(addedId);
  }
  useEffect(() => {
    if (!revealId) return;
    const shown = graph.nodes.some((n) => n.id === `p:${revealId}`);
    setView(shown ? {} : { focus: revealFocus(data, revealId), mode: "descendants" });
    // Once per added person; the graph and data it reads are the ones that already include them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealId]);
  const revealedFor = useRef<string | null>(null);

  const selected = selectedId ? byId.get(selectedId) : undefined;
  const kinOf = useMemo(() => (mePersonId ? createKinshipResolver(data, mePersonId, locale) : null), [data, mePersonId, locale]);
  const kinship = useMemo(() => (selected && kinOf && selected.id !== mePersonId ? kinOf(selected.id) : null), [selected, kinOf, mePersonId]);

  // Wide screens: one inspector on the right, the trailing side (HIG), for whatever is selected: the
  // person's summary, or the form that replaces it. It takes its room from the chart instead of covering
  // it, comes in from the right and leaves the same way, and only then gives the room back.
  const formInInspector = wide && panelOpen;
  const inspectorOpen = wide && (formInInspector || Boolean(selected));
  const [inspectorMounted, setInspectorMounted] = useState(inspectorOpen);
  if (inspectorOpen && !inspectorMounted) setInspectorMounted(true);
  // What it showed, kept while it plays out after the selection is gone.
  const [shownPerson, setShownPerson] = useState<Person | null>(selected ?? null);
  if (selected && selected !== shownPerson) setShownPerson(selected);
  // Backstop for when no animationend comes (animations turned off): never leave an empty panel taking room.
  useEffect(() => {
    if (inspectorOpen || !inspectorMounted) return;
    const timer = setTimeout(() => setInspectorMounted(false), 400);
    return () => clearTimeout(timer);
  }, [inspectorOpen, inspectorMounted]);

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
            onPath: path.persons.has(n.personId),
            isSelected: selectedId === n.personId,
            draft: n.personId === DRAFT_ID,
          };
          return { id: n.id, type: "person", position, data: nodeData };
        }
        if (n.kind === "union") {
          const u = unionById.get(n.unionId);
          const unionData: UnionNodeData = {
            unionId: n.unionId,
            status: n.status,
            onPath: path.unions.has(n.unionId),
            collapsible: n.collapsible,
            collapsed: collapsed.has(n.unionId),
            owner: [u?.partnerAId, u?.partnerBId].map((id) => (id ? byId.get(id)?.fullName : null)).filter(Boolean).join(" & "),
            onToggle: toggle,
          };
          return { id: n.id, type: "union", position, data: unionData, selectable: false };
        }
        return { id: n.id, type: "unknown", position, data: {}, selectable: false };
      });
  }, [positions, graph.nodes, byId, unionById, treeId, mePersonId, collapsed, toggle, selectedId, path]);

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

  const { fitView, setCenter, getZoom, flowToScreenPosition } = useReactFlow();

  function openNode(node: Node) {
    if (node.type !== "person" || (node.data as PersonNodeData).draft) return;
    if (draft) actions?.onClose();
    setSelectedId((node.data as PersonNodeData).person.id);
    // On phones the toolbar covers the top and the sheet the lower part: centre the tapped card in the
    // strip still visible between them.
    const chart = flowRef.current;
    if (!wide && chart) {
      const zoom = getZoom();
      const height = chart.clientHeight;
      const top = toolbarRef.current?.offsetHeight ?? 0;
      const sheet = Math.min(400, height * 0.55);
      const target = (top + (height - sheet)) / 2;
      setCenter(node.position.x + PERSON_W / 2, node.position.y + PERSON_H / 2 + (height / 2 - target) / zoom, { zoom, duration: pan() });
    }
  }
  // A card being added (or someone being linked): keep it in view, beside the inspector on wide screens
  // (which already took its room from the chart) and above the form sheet on phones. It moves when the
  // form changes (another birth order), so check on every layout, but only pan when it has left the
  // visible part of the chart.
  const draftTarget = draft?.kind === "add" ? (draft.existingId ?? DRAFT_ID) : null;
  // On wide screens the same goes for the selected card: opening the inspector narrows the chart and could
  // leave it cut off at the new edge. (Phones centre a tapped card themselves, in openNode.)
  const keepInView = draftTarget ?? (wide ? selectedId : null);
  // The sidebar opening narrows the chart; React Flow learns its new width a frame later, and centring
  // before that would use the old one. Checking again on every width change catches it.
  const flowWidth = useStore((st) => st.width);
  useEffect(() => {
    const at = keepInView && positions && !stale ? positions[`p:${keepInView}`] : undefined;
    const chart = flowRef.current;
    if (!at || !chart) return;
    const narrow = !wide;
    const box = chart.getBoundingClientRect();
    const bottom = narrow ? box.top + box.height * 0.4 : box.bottom;
    const top = box.top + (toolbarRef.current?.offsetHeight ?? 0);
    const a = flowToScreenPosition({ x: at.x, y: at.y });
    const b = flowToScreenPosition({ x: at.x + PERSON_W, y: at.y + PERSON_H });
    // With some room to spare, so the card and its "Unsaved" label don't touch the edge.
    const m = 24;
    if (a.x >= box.left + m && b.x <= box.right - m && a.y >= top + m && b.y <= bottom - m) return;
    const zoom = Math.max(getZoom(), 0.85);
    setCenter(at.x + PERSON_W / 2, at.y + PERSON_H / 2 + (narrow ? (box.height * 0.3) / zoom : 0), { zoom, duration: pan() });
  }, [keepInView, positions, stale, getZoom, setCenter, flowToScreenPosition, flowWidth, wide]);

  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!positions || stale) return;
    // A person just added: bring their card to the middle, whether or not the view itself changed.
    const added = revealId && revealedFor.current !== revealId ? positions[`p:${revealId}`] : undefined;
    if (added) {
      revealedFor.current = revealId;
      fittedFor.current = viewKey;
      // Their summary opens with them: in the inspector, which has its own room, or in the phone sheet, so
      // keep the card above that.
      const zoom = Math.max(getZoom(), 0.85);
      const narrow = !wide;
      requestAnimationFrame(() => setCenter(added.x + PERSON_W / 2, added.y + PERSON_H / 2 + (narrow ? 140 / zoom : 0), { zoom, duration: pan() }));
      return;
    }
    if (fittedFor.current === viewKey) return;
    fittedFor.current = viewKey;
    requestAnimationFrame(() => {
      // Phones always open on the focus person at a readable zoom (names stay around 13px) instead of
      // shrinking the whole tree to fit; the rest is a pan away.
      const narrow = window.innerWidth < 640;
      const p = focusId ? positions[`p:${focusId}`] : undefined;
      // A relative is already selected (the public example, a shared link): frame the whole route from
      // "Me" to them, between the two cards, at a zoom (0.6 to 0.9) that fits both (196 wide) in the
      // chart's width; the inspector beside it already took its own room.
      const me = mePersonId ? positions[`p:${mePersonId}`] : undefined;
      const them = selectedId ? positions[`p:${selectedId}`] : undefined;
      const room = (flowRef.current?.clientWidth ?? window.innerWidth) - 96;
      const span = me && them ? Math.abs(me.x - them.x) + 196 : Infinity;
      if (!narrow && me && them && path.persons.size > 1 && span * 0.6 <= room) {
        const zoom = Math.min(0.9, room / span);
        setCenter((me.x + them.x) / 2 + 98, (me.y + them.y) / 2 + 36, { zoom, duration: 0 });
      } else if (p && (narrow || graph.nodes.length > 60)) {
        setCenter(p.x + 98, p.y + (narrow ? 200 : 180), { zoom: narrow ? 0.95 : 0.85, duration: 0 });
      } else {
        fitView({ padding: 0.15, maxZoom: 1.1, duration: 0 }).then(() => {
          // A wide branch fitted to the screen is too small to read: show "Me" (or the focus) at a readable zoom instead.
          const target = (mePersonId && positions[`p:${mePersonId}`]) || p;
          if (target && getZoom() < 0.7) setCenter(target.x + 98, target.y + 36, { zoom: 0.85, duration: 0 });
        });
      }
    });
  }, [positions, stale, viewKey, fitView, setCenter, getZoom, graph.nodes.length, focusId, mePersonId, selectedId, path, revealId, wide]);


  // Folded families in the current chart, for the "Expand all" button.
  const foldedCount = graph.nodes.filter((n) => n.kind === "union" && collapsed.has(n.unionId)).length;

  const flowRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  if (!focusId) {
    return (
      <Empty className="m-4 bg-card">
        <EmptyHeader>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </EmptyHeader>
        {canEdit && !demo ? (
          <EmptyContent>
            <Link href={`/trees/${treeId}/people/new`} className={buttonVariants()}>
              <UserRoundPlusIcon data-icon="inline-start" /> {t("empty.addFirst")}
            </Link>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  const summary = (person: Person) => ({
    treeId,
    person,
    isMe: person.id === mePersonId,
    kinshipLabel: person.id === selected?.id ? (kinship?.label ?? null) : null,
    meLinked: Boolean(mePersonId),
    demo,
    isFocus: person.id === focusId,
    mode,
    canEdit,
    actions,
    onFocus: () => setView({ focus: person.id }),
  });

  return (
    <div className="flex min-w-0 flex-1">
    <div className="relative flex min-w-0 flex-1 flex-col">
      {/* Controls float over the chart on their own material, with no bar behind them, so the family runs
          edge to edge (HIG: defer to content). Phones get two rows: direction and actions, then search. */}
      <div ref={toolbarRef} className="no-print pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 p-3 *:pointer-events-auto">
        <div className="material flex rounded-[10px] bg-muted/85 p-0.5 shadow-[0_1px_2px_rgb(0_0_0/0.06)] backdrop-blur-xl" role="group" aria-label={t("mode.label")}>
          {(
            [
              ["all", t("mode.all"), NetworkIcon],
              ["descendants", t("mode.descendants"), ArrowDownFromLineIcon],
              ["ancestors", t("mode.ancestors"), ArrowUpFromLineIcon],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setView({ mode: value })}
              className={cn(
                "hit flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm outline-none transition-[color,background-color,box-shadow,opacity] duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70 active:duration-0",
                mode === value ? "bg-card font-medium text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
        {foldedCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="hit material border-transparent bg-card/85 shadow-[0_1px_2px_rgb(0_0_0/0.06)] backdrop-blur-xl"
            onClick={unfoldAll}
            title={folds[viewKey] ? undefined : t("expandAllHint")}
          >
            <ChevronsUpDownIcon data-icon="inline-start" /> {t("expandAll", { count: foldedCount })}
          </Button>
        ) : null}
        <FocusSearch data={data} onPick={(id) => setView({ focus: id })} />
        {mePersonId && mePersonId !== focusId ? (
          <Button variant="outline" size="sm" className="hit material border-transparent bg-card/85 shadow-[0_1px_2px_rgb(0_0_0/0.06)] backdrop-blur-xl max-sm:px-2.5" onClick={() => setView({ focus: mePersonId })}>
            <CrosshairIcon data-icon="inline-start" /> <span className="max-sm:sr-only">{t("me")}</span>
          </Button>
        ) : null}
      </div>

      <div ref={flowRef} className="relative min-h-[60dvh] flex-1" aria-label={mode === "all" ? t("flowLabel.all") : t(`flowLabel.${mode}`, { name: byId.get(focusId)?.fullName ?? "" })}>
        {!positions ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            <span role="status" className="flex items-center gap-2">
              <Spinner /> {t("layouting")}
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
          ariaLabelConfig={{
            "node.a11yDescription.default": t("flow.nodeHint"),
            "controls.ariaLabel": t("flow.controls"),
            "controls.zoomIn.ariaLabel": t("flow.zoomIn"),
            "controls.zoomOut.ariaLabel": t("flow.zoomOut"),
            "controls.fitView.ariaLabel": t("flow.fitView"),
          }}
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
          <span role="status" className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-card px-3 py-1 text-xs text-muted-foreground shadow">{t("relayout")}</span>
        ) : null}
      </div>

      {/* Phones: the summary is a sheet from the bottom, hidden while a form sheet shows the person. */}
      {!wide && selected && !draft ? <PersonSheet ref={sheetRef} {...summary(selected)} onClose={() => setSelectedId(null)} /> : null}
      {!inspectorOpen && !draft && !selected && canEdit && data.persons.length < 4 && focusId ? (
        <StarterGuide treeId={treeId} person={byId.get(focusId)!} onAdd={actions?.onAdd} />
      ) : null}
    </div>

    {wide && inspectorMounted ? (
      <aside
        aria-label={formInInspector ? undefined : shownPerson ? t("summary.aria", { name: shownPerson.fullName }) : undefined}
        inert={!inspectorOpen}
        onKeyDown={(e) => (e.key === "Escape" && !formInInspector ? setSelectedId(null) : null)}
        onAnimationEnd={(e) => (e.target === e.currentTarget && !inspectorOpen ? setInspectorMounted(false) : null)}
        className={cn("no-print relative w-96 shrink-0 border-l bg-grouped xl:w-md", inspectorOpen ? "side-in" : "side-out")}
      >
        <div className="absolute inset-0 flex flex-col">
          {formInInspector ? panel : shownPerson ? <InspectorSummary {...summary(shownPerson)} onClose={() => setSelectedId(null)} /> : null}
        </div>
      </aside>
    ) : null}
    {formInInspector ? null : panel}
    </div>
  );
}

/** Arrow keys move through the matches, Enter or a click makes the person the chart's centre. */
function FocusSearch({ data, onPick }: { data: TreeData; onPick: (id: string) => void }) {
  const t = useTranslations("chart");
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
        placeholder={t("search.placeholder")}
        aria-label={t("search.label")}
        className="material order-last w-full border-transparent bg-card/85 shadow-[0_1px_2px_rgb(0_0_0/0.06)] backdrop-blur-xl sm:order-none sm:w-56"
      >
        <InputGroupAddon align="inline-start">
          <SearchIcon />
        </InputGroupAddon>
      </ComboboxInput>
      <ComboboxContent className="sm:min-w-72">
        <ComboboxEmpty>{t("search.empty")}</ComboboxEmpty>
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

const QUICK_ADD = [
  { rel: "parent", icon: UserRoundPlusIcon },
  { rel: "partner", icon: HeartIcon },
  { rel: "child", icon: BabyIcon },
  { rel: "sibling", icon: UsersRoundIcon },
] as const;

/**
 * "Add relatives of …", opening the form in place (or the page, without actions): one row per relation in the
 * inspector; on the phone sheet, where height is short, a row of quick-action tiles like a contact's.
 */
function AddRows({ treeId, person, onAdd, title, tiles = false }: { treeId: string; person: Person; onAdd?: EditActions["onAdd"]; title: string; tiles?: boolean }) {
  const t = useTranslations("chart");
  // Saving returns here with the same focus and direction instead of opening the new profile.
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const back = encodeURIComponent(query ? `${pathname}?${query}` : pathname);
  if (tiles) {
    const tile =
      "grid min-h-16 justify-items-center content-center gap-1 rounded-xl bg-card px-1 py-2 text-[13px] font-medium text-soga-ink outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted active:duration-0";
    return (
      <section className="grid gap-1.5">
        <h3 className="px-4 text-[13px] leading-tight text-muted-foreground">{title}</h3>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_ADD.map((a) =>
            onAdd ? (
              <button key={a.rel} type="button" onClick={() => onAdd(a.rel, person.id)} className={tile}>
                <a.icon className="size-5" />
                {t(`quickAdd.${a.rel}`)}
              </button>
            ) : (
              <Link key={a.rel} href={`/trees/${treeId}/people/new?rel=${a.rel}&from=${person.id}&back=${back}`} className={tile}>
                <a.icon className="size-5" />
                {t(`quickAdd.${a.rel}`)}
              </Link>
            ),
          )}
        </div>
      </section>
    );
  }
  return (
    <Rows title={title}>
      {QUICK_ADD.map((a) => (
        <Row key={a.rel} icon={a.icon} onClick={onAdd ? () => onAdd(a.rel, person.id) : undefined} href={onAdd ? undefined : `/trees/${treeId}/people/new?rel=${a.rel}&from=${person.id}&back=${back}`}>
          {t(`quickAdd.${a.rel}`)}
        </Row>
      ))}
    </Rows>
  );
}

/** Lets the chart close the sheet with the same motion as its close button. */
interface SheetHandle {
  dismiss: () => void;
}

type SummaryProps = {
  treeId: string;
  person: Person;
  isMe: boolean;
  kinshipLabel: string | null;
  meLinked: boolean;
  demo: boolean;
  isFocus: boolean;
  mode: Mode;
  canEdit: boolean;
  actions?: EditActions;
  onFocus: () => void;
};

function Avatar({ treeId, person, size }: { treeId: string; person: Person; size: "sm" | "lg" }) {
  const photo = photoUrl(treeId, person);
  const big = size === "lg";
  const shape = person.gender === "male" ? (big ? "rounded-2xl" : "rounded-lg") : person.gender === "female" ? "rounded-full" : big ? "rounded-3xl" : "rounded-xl";
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden monogram font-semibold", big ? "size-20 text-2xl" : "size-11 text-sm", shape)}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" width={big ? 80 : 44} height={big ? 80 : 44} className="size-full object-cover" />
      ) : (
        initialsOf(person.fullName)
      )}
    </span>
  );
}

/**
 * Phones and narrow windows: the summary as a bottom sheet (drag down or tap outside to close), with the
 * same grouped rows as the inspector and a compact header: who it is on the left, Edit and close on the right.
 */
function PersonSheet({ onClose, ref, ...props }: SummaryProps & { onClose: () => void; ref?: React.Ref<SheetHandle> }) {
  const { ref: sheetEl, dismiss, handlers } = useSheetMotion<HTMLElement>(onClose);
  useImperativeHandle(ref, () => ({ dismiss }), [dismiss]);
  const t = useTranslations("chart");
  const { treeId, person, isMe, actions } = props;
  return (
    <aside
      ref={sheetEl}
      {...handlers}
      className="no-print absolute inset-x-0 bottom-0 z-20 mx-auto max-w-lg touch-none will-change-transform rounded-t-3xl border-t bg-grouped px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(0_0_0/0.12)] sm:border-x"
      aria-label={t("summary.aria", { name: person.fullName })}
    >
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" aria-hidden />
      <header className="flex items-center gap-3">
        <Avatar treeId={treeId} person={person} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[1.375rem] leading-tight tracking-[-0.01em]">{person.fullName}</p>
          <p className="truncate text-[13px] text-muted-foreground">
            {isMe ? `${t("summary.you")} · ` : ""}
            {subtitle(person) || t("summary.unknownDates")}
          </p>
        </div>
        {actions ? (
          <Button type="button" variant="ghost" className="h-11 px-2 text-[17px] font-semibold text-soga-ink" onClick={() => actions.onEdit(person.id)}>
            {t("summary.edit")}
          </Button>
        ) : null}
        <button type="button" onClick={dismiss} className={closeButton} aria-label={t("summary.close")}>
          <XIcon className="size-4" />
        </button>
      </header>
      <div className="mt-4 grid gap-4">
        <SummaryBody {...props} compact />
      </div>
    </aside>
  );
}

/**
 * Wide screens: the summary in the inspector, laid out like a contact in Contacts. The bar matches the form
 * that replaces it (Close where Cancel is, Edit where Save is), and the rest is grouped rows straight on
 * the panel, with no card inside the card.
 */
function InspectorSummary({ onClose, ...props }: SummaryProps & { onClose: () => void }) {
  const t = useTranslations("chart");
  const { treeId, person, isMe, actions } = props;
  return (
    <div className="panel-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className={cn("panel-bar material sticky top-0 z-10", sheetBar)}>
        <Button type="button" variant="ghost" className={barCancel} onClick={onClose}>
          {t("summary.close")}
        </Button>
        <span />
        {actions ? (
          <Button type="button" variant="ghost" className={barConfirm} onClick={() => actions.onEdit(person.id)}>
            {t("summary.edit")}
          </Button>
        ) : (
          <span />
        )}
      </div>

      <div className="grid gap-6 px-4 pt-5 pb-8">
        <header className="grid justify-items-center gap-3 text-center">
          <Avatar treeId={treeId} person={person} size="lg" />
          <div>
            <h2 className="font-display text-[1.75rem] leading-tight tracking-[-0.015em] text-balance">{person.fullName}</h2>
            {person.nickname ? <p className="text-[15px] text-muted-foreground">“{person.nickname}”</p> : null}
            <p className="mt-0.5 text-[15px] text-muted-foreground">{subtitle(person) || t("summary.unknownDates")}</p>
          </div>
          {isMe ? <p className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium">{t("summary.you")}</p> : null}
        </header>
        <SummaryBody {...props} />
      </div>
    </div>
  );
}

/** Who the person is to me and what can be done from here: the same groups in the sheet and the inspector. */
function SummaryBody({ treeId, person, isMe, kinshipLabel, meLinked, demo, isFocus, mode, canEdit, actions, onFocus, compact = false }: SummaryProps & { compact?: boolean }) {
  const t = useTranslations("chart");
  const firstName = person.nickname || person.fullName.split(" ")[0];
  return (
    <>
      {!isMe && kinshipLabel ? (
        <Rows>
          <div className="px-4 py-3">
            <p className="text-[13px] text-muted-foreground">{t("summary.relationToYou")}</p>
            <p className="font-display text-xl leading-tight">{kinshipLabel}</p>
          </div>
        </Rows>
      ) : !isMe && !meLinked ? (
        <p className="px-4 text-[13px] text-muted-foreground">{t("summary.markYourself")}</p>
      ) : null}

      {/* Says what the chart will show, instead of the internal "focus" idea. */}
      {!isFocus || !demo || !actions ? (
        <Rows>
          {!isFocus ? (
            <Row icon={CrosshairIcon} onClick={onFocus}>
              {t(`summary.view.${mode}`, { name: firstName })}
            </Row>
          ) : null}
          {!demo ? (
            <Row icon={ExternalLinkIcon} href={`/trees/${treeId}/people/${person.id}`}>
              {t("summary.openProfile")}
            </Row>
          ) : !actions ? (
            <Row icon={UserRoundPlusIcon} href="/login">
              {t("summary.createYourTree")}
            </Row>
          ) : null}
        </Rows>
      ) : null}

      {canEdit ? <AddRows treeId={treeId} person={person} onAdd={actions?.onAdd} title={t("addRelatives", { name: firstName })} tiles={compact} /> : null}
    </>
  );
}

/** An inset grouped list, as in iOS Settings: an optional caption over rows on one card. */
function Rows({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-1.5">
      {title ? <h3 className="px-4 text-[13px] leading-tight text-muted-foreground">{title}</h3> : null}
      <div className="divide-y divide-border/70 overflow-hidden rounded-xl bg-card">{children}</div>
    </section>
  );
}

/** One tappable row: tinted icon, label, chevron. Highlights on press. */
function Row({ icon: Icon, children, onClick, href }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; onClick?: () => void; href?: string }) {
  const className =
    "flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset active:bg-muted active:duration-0";
  const content = (
    <>
      <Icon className="size-[18px] shrink-0 text-soga-ink" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/70" />
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

const closeButton =
  "hit grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-border active:duration-0";

/** Shown on a near-empty tree: the next step is always one tap away, as rows on a floating material card. */
function StarterGuide({ treeId, person, onAdd }: { treeId: string; person: Person; onAdd?: EditActions["onAdd"] }) {
  const t = useTranslations("chart");
  return (
    <aside className="sheet-in no-print material absolute inset-x-3 bottom-3 z-10 mx-auto grid max-w-md gap-3 rounded-2xl bg-grouped/90 p-4 shadow-lg backdrop-blur-xl sm:right-3 sm:left-auto sm:w-96">
      <div className="px-1">
        <p className="font-display text-xl leading-tight tracking-[-0.01em]">{t("starter.title", { name: person.nickname || person.fullName })}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("starter.body")}</p>
      </div>
      <AddRows treeId={treeId} person={person} onAdd={onAdd} title={t("addRelativesGeneric")} tiles />
    </aside>
  );
}
