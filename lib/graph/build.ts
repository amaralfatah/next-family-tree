import type { Person, TreeData, Union } from "@/lib/types";

/**
 * A family chart is a DAG of people and unions: partners point into their union node,
 * the union points to its children. Parents always sit above children, for both the
 * descendant ("bani") and the ancestor view.
 */
export type GraphNode =
  | { id: string; kind: "person"; personId: string; focus: boolean; hiddenCount: number; collapsible: boolean }
  | { id: string; kind: "union"; unionId: string; status: Union["status"] }
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
  hiddenCount: 0,
  collapsible: false,
});

/** Number of distinct descendants below a person (children, their partners' children, ...). */
export function countDescendants(index: Index, personId: string): number {
  const seen = new Set<string>();
  const stack = [personId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const u of index.unionsOf.get(id) ?? []) {
      for (const c of index.childrenOf.get(u.id) ?? []) {
        if (!seen.has(c.childId) && c.childId !== personId) {
          seen.add(c.childId);
          stack.push(c.childId);
        }
      }
    }
  }
  return seen.size;
}

export function buildDescendantGraph(data: TreeData, rootId: string, collapsed: ReadonlySet<string> = new Set()): FamilyGraph {
  const index = indexTree(data);
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  if (!index.persons.has(rootId)) return { nodes: [], edges: [] };

  const expanded = new Set<string>();
  const queue = [rootId];
  nodes.set(`p:${rootId}`, personNode(rootId, true));

  while (queue.length) {
    const pid = queue.shift()!;
    if (expanded.has(pid)) continue;
    expanded.add(pid);
    const node = nodes.get(`p:${pid}`) as Extract<GraphNode, { kind: "person" }>;
    const own = index.unionsOf.get(pid) ?? [];
    const hasChildren = own.some((u) => (index.childrenOf.get(u.id) ?? []).length > 0);
    node.collapsible = hasChildren && pid !== rootId;
    if (collapsed.has(pid) && pid !== rootId) {
      node.hiddenCount = countDescendants(index, pid);
      // Partners stay visible so the card still reads "X & Y".
      for (const u of own) addUnion(u, pid, false);
      continue;
    }
    for (const u of own) addUnion(u, pid, true);
  }

  function addUnion(u: Union, from: string, withChildren: boolean) {
    const uid = `u:${u.id}`;
    const kids = index.childrenOf.get(u.id) ?? [];
    const partner = u.partnerAId === from ? u.partnerBId : u.partnerAId;
    // A union without a partner and without visible children adds nothing to the chart.
    if (!partner && (!withChildren || kids.length === 0)) return;
    if (!nodes.has(uid)) {
      nodes.set(uid, { id: uid, kind: "union", unionId: u.id, status: u.status });
      edges.push({ id: `e:${from}>${u.id}`, source: `p:${from}`, target: uid, kind: "partner" });
      if (partner) {
        if (!nodes.has(`p:${partner}`)) nodes.set(`p:${partner}`, personNode(partner, false));
        edges.push({ id: `e:${partner}>${u.id}`, source: `p:${partner}`, target: uid, kind: "partner" });
      } else {
        const unk = `x:${u.id}`;
        nodes.set(unk, { id: unk, kind: "unknown", unionId: u.id });
        edges.push({ id: `e:x>${u.id}`, source: unk, target: uid, kind: "partner" });
      }
    }
    if (!withChildren) return;
    for (const c of kids) {
      if (!nodes.has(`p:${c.childId}`)) nodes.set(`p:${c.childId}`, personNode(c.childId, false));
      const eid = `e:${u.id}>${c.childId}`;
      if (!edges.some((e) => e.id === eid)) {
        edges.push({ id: eid, source: uid, target: `p:${c.childId}`, kind: "child", relation: c.relation });
      }
      queue.push(c.childId);
    }
  }

  // Drop dangling unions (collapsed person whose union only had hidden children and no partner).
  return { nodes: [...nodes.values()], edges };
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
    const node = nodes.get(`p:${pid}`) as Extract<GraphNode, { kind: "person" }>;
    const ups = index.parentUnionsOf.get(pid) ?? [];
    node.collapsible = ups.length > 0 && pid !== personId;
    if (collapsed.has(pid) && pid !== personId) {
      node.hiddenCount = countAncestors(index, pid);
      continue;
    }
    for (const link of ups) {
      const u = index.unions.get(link.unionId);
      if (!u) continue;
      const uid = `u:${u.id}`;
      if (!nodes.has(uid)) {
        nodes.set(uid, { id: uid, kind: "union", unionId: u.id, status: u.status });
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

function countAncestors(index: Index, personId: string): number {
  const seen = new Set<string>();
  const stack = [personId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const link of index.parentUnionsOf.get(id) ?? []) {
      const u = index.unions.get(link.unionId);
      for (const p of [u?.partnerAId, u?.partnerBId]) {
        if (p && !seen.has(p)) {
          seen.add(p);
          stack.push(p);
        }
      }
    }
  }
  return seen.size;
}

/**
 * For big trees, collapse every branch below the first depth where the chart would
 * exceed `budget` people, so the first render stays fast. Users expand branches on demand.
 */
export function autoCollapse(data: TreeData, rootId: string, budget = 300): Set<string> {
  const index = indexTree(data);
  const collapsed = new Set<string>();
  let frontier = [rootId];
  const seen = new Set(frontier);
  let total = 1;
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
      for (const pid of frontier) collapsed.add(pid);
      break;
    }
    total += next.length;
    frontier = next;
  }
  if (collapsed.has(rootId)) collapsed.delete(rootId);
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
