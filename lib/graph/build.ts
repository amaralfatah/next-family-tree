import type { Person, TreeData, Union } from "@/lib/types";

/**
 * A family chart is a DAG of people and unions: partners point into their union node,
 * the union points to its children. Parents always sit above children, for both the
 * descendant ("bani") and the ancestor view.
 */
export type GraphNode =
  | { id: string; kind: "person"; personId: string; focus: boolean }
  | { id: string; kind: "union"; unionId: string; status: Union["status"]; collapsible: boolean }
  | { id: string; kind: "unknown"; unionId: string };

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: "partner" | "child";
  relation?: "biological" | "adopted" | "step";
}

export interface FamilyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Index {
  persons: Map<string, Person>;
  unions: Map<string, Union>;
  /** unions a person is a partner in, ordered by orderIndex */
  unionsOf: Map<string, Union[]>;
  /** child links per union, ordered by birth order */
  childrenOf: Map<string, { childId: string; relation: "biological" | "adopted" | "step"; birthOrder: number | null }[]>;
  /** unions in which a person is a child */
  parentUnionsOf: Map<string, { unionId: string; relation: "biological" | "adopted" | "step" }[]>;
}

export function indexTree(data: TreeData): Index {
  const persons = new Map(data.persons.map((p) => [p.id, p]));
  const unions = new Map(data.unions.map((u) => [u.id, u]));
  const unionsOf = new Map<string, Union[]>();
  for (const u of data.unions) {
    for (const pid of [u.partnerAId, u.partnerBId]) {
      if (!pid) continue;
      const list = unionsOf.get(pid) ?? [];
      list.push(u);
      unionsOf.set(pid, list);
    }
  }
  for (const list of unionsOf.values()) list.sort((a, b) => a.orderIndex - b.orderIndex);

  const childrenOf: Index["childrenOf"] = new Map();
  const parentUnionsOf: Index["parentUnionsOf"] = new Map();
  for (const c of data.children) {
    const list = childrenOf.get(c.unionId) ?? [];
    list.push({ childId: c.childId, relation: c.relation, birthOrder: c.birthOrder });
    childrenOf.set(c.unionId, list);
    const up = parentUnionsOf.get(c.childId) ?? [];
    up.push({ unionId: c.unionId, relation: c.relation });
    parentUnionsOf.set(c.childId, up);
  }
  for (const [unionId, list] of childrenOf) {
    list.sort((a, b) => compareSiblings(persons.get(a.childId), persons.get(b.childId), a.birthOrder, b.birthOrder));
    childrenOf.set(unionId, list);
  }
  return { persons, unions, unionsOf, childrenOf, parentUnionsOf };
}

function compareSiblings(a: Person | undefined, b: Person | undefined, oa: number | null, ob: number | null) {
  const da = a?.birthPrecision !== "unknown" ? a?.birthDate : null;
  const db = b?.birthPrecision !== "unknown" ? b?.birthDate : null;
  if (da && db && da !== db) return da < db ? -1 : 1;
  return (oa ?? Number.MAX_SAFE_INTEGER) - (ob ?? Number.MAX_SAFE_INTEGER);
}

const personNode = (personId: string, focus: boolean): GraphNode => ({
  id: `p:${personId}`,
  kind: "person",
  personId,
  focus,
});

/**
 * Descendants fold per union, so a person with several marriages can have each family folded on its
 * own. `collapsed` holds union ids.
 */
export function buildDescendantGraph(data: TreeData, rootId: string, collapsed: ReadonlySet<string> = new Set()): FamilyGraph {
  const index = indexTree(data);
  if (!index.persons.has(rootId)) return { nodes: [], edges: [] };
  return descendantsOf(index, [rootId], rootId, collapsed);
}

/**
 * The whole family at once: everyone's descendants, starting from every earliest ancestor, so siblings,
 * cousins and in-laws' families all show without re-centring. `focusId` is only highlighted.
 */
export function buildFamilyGraph(data: TreeData, focusId: string, collapsed: ReadonlySet<string> = new Set()): FamilyGraph {
  const index = indexTree(data);
  if (!index.persons.has(focusId)) return { nodes: [], edges: [] };
  return descendantsOf(index, familyRoots(index, focusId), focusId, collapsed);
}

/**
 * People with no recorded parents, except those who only married in (their partner has parents): they
 * show next to that partner instead. The focus's own line comes first so it sits on the left.
 */
export function familyRoots(index: Index, focusId: string): string[] {
  const hasParents = (id: string | null) => Boolean(id && index.parentUnionsOf.get(id)?.length);
  const roots = [...index.persons.keys()].filter(
    (id) => !hasParents(id) && !(index.unionsOf.get(id) ?? []).some((u) => hasParents(u.partnerAId === id ? u.partnerBId : u.partnerAId)),
  );
  // Walk up from the focus (first recorded parent each time) to find its earliest ancestor.
  let top = focusId;
  const seen = new Set([top]);
  for (;;) {
    const link = index.parentUnionsOf.get(top)?.[0];
    const parent = link && index.unions.get(link.unionId)?.partnerAId;
    if (!parent || seen.has(parent)) break;
    seen.add(parent);
    top = parent;
  }
  const first = roots.includes(top) ? top : roots.find((r) => (index.unionsOf.get(r) ?? []).some((u) => u.partnerAId === top || u.partnerBId === top));
  return first ? [first, ...roots.filter((r) => r !== first)] : roots;
}

function descendantsOf(index: Index, roots: string[], focusId: string, collapsed: ReadonlySet<string>): FamilyGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const expanded = new Set<string>();
  const queue = [...roots];
  for (const r of roots) nodes.set(`p:${r}`, personNode(r, r === focusId));

  while (queue.length) {
    const pid = queue.shift()!;
    if (expanded.has(pid)) continue;
    expanded.add(pid);
    for (const u of index.unionsOf.get(pid) ?? []) addUnion(u, pid, !collapsed.has(u.id));
  }

  function addUnion(u: Union, from: string, withChildren: boolean) {
    const uid = `u:${u.id}`;
    const kids = index.childrenOf.get(u.id) ?? [];
    const partner = u.partnerAId === from ? u.partnerBId : u.partnerAId;
    // A union without a partner and without children adds nothing to the chart. A folded one stays:
    // its dot is what unfolds it.
    if (!partner && kids.length === 0) return;
    if (!nodes.has(uid)) {
      nodes.set(uid, { id: uid, kind: "union", unionId: u.id, status: u.status, collapsible: kids.length > 0 });
      edges.push({ id: `e:${from}>${u.id}`, source: `p:${from}`, target: uid, kind: "partner" });
      if (partner) {
        if (!nodes.has(`p:${partner}`)) nodes.set(`p:${partner}`, personNode(partner, partner === focusId));
        edges.push({ id: `e:${partner}>${u.id}`, source: `p:${partner}`, target: uid, kind: "partner" });
      } else {
        const unk = `x:${u.id}`;
        nodes.set(unk, { id: unk, kind: "unknown", unionId: u.id });
        edges.push({ id: `e:x>${u.id}`, source: unk, target: uid, kind: "partner" });
      }
    }
    if (!withChildren) return;
    for (const c of kids) {
      if (!nodes.has(`p:${c.childId}`)) nodes.set(`p:${c.childId}`, personNode(c.childId, c.childId === focusId));
      const eid = `e:${u.id}>${c.childId}`;
      if (!edges.some((e) => e.id === eid)) {
        edges.push({ id: eid, source: uid, target: `p:${c.childId}`, kind: "child", relation: c.relation });
      }
      queue.push(c.childId);
    }
  }

  return inFamilyOrder(index, roots, nodes, edges);
}

/**
 * ELK breaks ties within a row by model order, and the queue above adds people breadth-first, so
 * a spouse would come after all of their partner's siblings and the siblings could swap places.
 * Reorder depth-first instead: each person next to their spouses (the first spouse on the left when
 * there are several), then their unions, then each child's family in birth order.
 */
function inFamilyOrder(index: Index, roots: string[], nodes: Map<string, GraphNode>, edges: GraphEdge[]): FamilyGraph {
  const order: string[] = [];
  const placed = new Set<string>();
  const visited = new Set<string>();
  const place = (id: string) => {
    if (nodes.has(id) && !placed.has(id)) {
      placed.add(id);
      order.push(id);
    }
  };
  const visit = (pid: string) => {
    if (placed.has(`p:${pid}`) && !roots.includes(pid)) return;
    if (visited.has(pid)) return;
    visited.add(pid);
    const own = (index.unionsOf.get(pid) ?? []).filter((u) => nodes.has(`u:${u.id}`));
    const spouses = own.map((u) => {
      const partner = u.partnerAId === pid ? u.partnerBId : u.partnerAId;
      return partner ? `p:${partner}` : `x:${u.id}`;
    });
    if (spouses.length > 1) place(spouses[0]);
    place(`p:${pid}`);
    spouses.forEach((s, i) => (spouses.length > 1 && i === 0 ? null : place(s)));
    for (const u of own) place(`u:${u.id}`);
    for (const u of own) {
      for (const c of index.childrenOf.get(u.id) ?? []) {
        if (edges.some((e) => e.source === `u:${u.id}` && e.target === `p:${c.childId}`)) visit(c.childId);
      }
    }
  };
  for (const r of roots) {
    place(`p:${r}`);
    visit(r);
  }
  for (const id of nodes.keys()) place(id);
  const rank = new Map(order.map((id, i) => [id, i]));
  const sorted = [...edges].sort((a, b) => rank.get(a.target)! - rank.get(b.target)! || rank.get(a.source)! - rank.get(b.source)!);
  return { nodes: order.map((id) => nodes.get(id)!), edges: sorted };
}

export function buildAncestorGraph(data: TreeData, personId: string, collapsed: ReadonlySet<string> = new Set()): FamilyGraph {
  const index = indexTree(data);
  if (!index.persons.has(personId)) return { nodes: [], edges: [] };
  const nodes = new Map<string, GraphNode>([[`p:${personId}`, personNode(personId, true)]]);
  const edges: GraphEdge[] = [];
  const queue = [personId];
  const seen = new Set<string>();

  while (queue.length) {
    const pid = queue.shift()!;
    if (seen.has(pid)) continue;
    seen.add(pid);
    const ups = index.parentUnionsOf.get(pid) ?? [];
    if (collapsed.has(pid) && pid !== personId) continue;
    for (const link of ups) {
      const u = index.unions.get(link.unionId);
      if (!u) continue;
      const uid = `u:${u.id}`;
      if (!nodes.has(uid)) {
        nodes.set(uid, { id: uid, kind: "union", unionId: u.id, status: u.status, collapsible: false });
        for (const partner of [u.partnerAId, u.partnerBId]) {
          if (partner) {
            if (!nodes.has(`p:${partner}`)) nodes.set(`p:${partner}`, personNode(partner, false));
            edges.push({ id: `e:${partner}>${u.id}`, source: `p:${partner}`, target: uid, kind: "partner" });
            queue.push(partner);
          } else {
            nodes.set(`x:${u.id}`, { id: `x:${u.id}`, kind: "unknown", unionId: u.id });
            edges.push({ id: `e:x>${u.id}`, source: `x:${u.id}`, target: uid, kind: "partner" });
          }
        }
      }
      edges.push({ id: `e:${u.id}>${pid}`, source: uid, target: `p:${pid}`, kind: "child", relation: link.relation });
    }
  }
  return { nodes: [...nodes.values()], edges };
}

/**
 * Who to centre the descendant chart on so `personId` shows: one of their parents (a new sibling then
 * sits next to the others), or the person themself when no parent is recorded (a new parent then sits
 * above the child they were added to).
 */
export function revealFocus(data: TreeData, personId: string): string {
  const index = indexTree(data);
  const links = [...(index.parentUnionsOf.get(personId) ?? [])].sort((a, b) => Number(b.relation === "biological") - Number(a.relation === "biological"));
  for (const link of links) {
    const u = index.unions.get(link.unionId);
    if (u) return u.partnerAId;
  }
  return personId;
}

/**
 * For big trees, fold every family below the first depth where the chart would exceed `budget`
 * people, so the first render stays fast. Users unfold branches on demand. Returns union ids.
 */
export function autoCollapse(data: TreeData, rootId: string | string[], budget = 300): Set<string> {
  const index = indexTree(data);
  const collapsed = new Set<string>();
  const roots = Array.isArray(rootId) ? rootId : [rootId];
  let frontier = roots;
  const seen = new Set(frontier);
  let total = roots.length;
  while (frontier.length) {
    const next: string[] = [];
    for (const pid of frontier) {
      for (const u of index.unionsOf.get(pid) ?? []) {
        const partner = u.partnerAId === pid ? u.partnerBId : u.partnerAId;
        if (partner && !seen.has(partner)) {
          seen.add(partner);
          total++;
        }
        for (const c of index.childrenOf.get(u.id) ?? []) {
          if (!seen.has(c.childId)) {
            seen.add(c.childId);
            next.push(c.childId);
          }
        }
      }
    }
    if (total + next.length > budget) {
      for (const pid of frontier) {
        if (roots.includes(pid)) continue;
        for (const u of index.unionsOf.get(pid) ?? []) if ((index.childrenOf.get(u.id) ?? []).length) collapsed.add(u.id);
      }
      break;
    }
    total += next.length;
    frontier = next;
  }
  return collapsed;
}

/**
 * Generation number of every person relative to `rootId` (root = 1, children = 2,
 * partners share their partner's generation, parents = 0, -1, ...).
 */
export function generations(data: TreeData, rootId: string): Map<string, number> {
  const index = indexTree(data);
  const gen = new Map<string, number>();
  if (!index.persons.has(rootId)) return gen;
  gen.set(rootId, 1);
  const queue = [rootId];
  while (queue.length) {
    const pid = queue.shift()!;
    const g = gen.get(pid)!;
    const visit = (id: string | null | undefined, value: number) => {
      if (id && !gen.has(id)) {
        gen.set(id, value);
        queue.push(id);
      }
    };
    for (const u of index.unionsOf.get(pid) ?? []) {
      visit(u.partnerAId === pid ? u.partnerBId : u.partnerAId, g);
      for (const c of index.childrenOf.get(u.id) ?? []) visit(c.childId, g + 1);
    }
    for (const link of index.parentUnionsOf.get(pid) ?? []) {
      const u = index.unions.get(link.unionId);
      visit(u?.partnerAId, g - 1);
      visit(u?.partnerBId, g - 1);
    }
  }
  return gen;
}
