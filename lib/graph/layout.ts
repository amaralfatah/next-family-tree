import type { ElkNode } from "elkjs/lib/elk-api";
import type { FamilyGraph, GraphNode } from "./build";

export const PERSON_W = 196;
export const PERSON_H = 72;
export const UNION_SIZE = 14;
export const UNKNOWN_W = 120;
export const UNKNOWN_H = 40;

export function nodeSize(n: GraphNode) {
  if (n.kind === "person") return { width: PERSON_W, height: PERSON_H };
  if (n.kind === "union") return { width: UNION_SIZE, height: UNION_SIZE };
  return { width: UNKNOWN_W, height: UNKNOWN_H };
}

/** ELK "layered" input. Model order is kept so spouses and siblings stay in recorded order. */
export function toElk(graph: FamilyGraph): ElkNode {
  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.crossingMinimization.forceNodeModelOrder": "false",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
      "elk.spacing.nodeNode": "28",
      "elk.layered.spacing.nodeNodeBetweenLayers": "36",
      "elk.layered.spacing.edgeNodeBetweenLayers": "18",
      "elk.edgeRouting": "ORTHOGONAL",
    },
    children: graph.nodes.map((n) => ({ id: n.id, ...nodeSize(n) })),
    edges: graph.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };
}

export type Positions = Record<string, { x: number; y: number }>;

export function positionsFromElk(result: ElkNode): Positions {
  const out: Positions = {};
  for (const c of result.children ?? []) out[c.id] = { x: c.x ?? 0, y: c.y ?? 0 };
  return out;
}
