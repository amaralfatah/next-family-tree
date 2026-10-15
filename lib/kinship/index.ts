// "Hubungan dengan saya": finds how a target person is related to "me" and
// describes it in standard Indonesian kinship terms. Pure, no I/O.
//
// Strategy:
//   1. self / direct spouse
//   2. blood (incl. adoption): BFS up through biological/adopted parent links from
//      both people, pick the common ancestor minimizing up + down
//   3. step parent / step child (explicit "step" links or spouse of a parent)
//   4. named affinal terms: mertua, menantu, ipar, besan
//   5. generic affinal: "Istri dari <kerabat>" / "<kerabat> dari istri"
//   6. any other connection through the graph: "Kerabat jauh"
// Everything is BFS over adjacency built once per call, so it stays fast for
// trees with thousands of people.

import type { ChildRelation, Gender, Person, TreeData, Union } from "../types";

export interface KinshipResult {
  /** What TARGET is to ME, Indonesian, first letter capitalized. */
  label: string;
  /** Person ids from me to target inclusive. */
  path: string[];
  /** true if related by blood (incl. adoption), false if by marriage. */
  blood: boolean;
}

interface ParentLink {
  parentId: string;
  relation: ChildRelation;
  unionId: string;
}

interface SpouseLink {
  spouseId: string;
  union: Union;
}

interface Graph {
  persons: Map<string, Person>;
  unions: Map<string, Union>;
  /** childId -> parent links (all relations). */
  parentLinks: Map<string, ParentLink[]>;
  /** parentId -> child ids with relation. */
  childLinks: Map<string, { childId: string; relation: ChildRelation }[]>;
  spouses: Map<string, SpouseLink[]>;
  /** childId -> unionId -> birthOrder */
  birthOrders: Map<string, Map<string, number | null>>;
}

interface Ancestry {
  dist: Map<string, number>;
  /** ancestor -> the person one step closer to the origin */
  via: Map<string, string>;
}

interface Blood {
  up: number;
  down: number;
  path: string[];
}

// ---------------------------------------------------------------------------
// Graph building

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function buildGraph(data: TreeData): Graph {
  const persons = new Map(data.persons.map((p) => [p.id, p]));
  const unions = new Map(data.unions.map((u) => [u.id, u]));
  const parentLinks = new Map<string, ParentLink[]>();
  const childLinks = new Map<string, { childId: string; relation: ChildRelation }[]>();
  const spouses = new Map<string, SpouseLink[]>();
  const birthOrders = new Map<string, Map<string, number | null>>();

  for (const u of data.unions) {
    if (u.partnerBId && u.partnerBId !== u.partnerAId) {
      push(spouses, u.partnerAId, { spouseId: u.partnerBId, union: u });
      push(spouses, u.partnerBId, { spouseId: u.partnerAId, union: u });
    }
  }
  for (const c of data.children) {
    const u = unions.get(c.unionId);
    if (!u) continue;
    let orders = birthOrders.get(c.childId);
    if (!orders) birthOrders.set(c.childId, (orders = new Map()));
    orders.set(u.id, c.birthOrder);
    for (const pid of [u.partnerAId, u.partnerBId]) {
      if (!pid || pid === c.childId) continue;
      push(parentLinks, c.childId, { parentId: pid, relation: c.relation, unionId: u.id });
      push(childLinks, pid, { childId: c.childId, relation: c.relation });
    }
  }
  return { persons, unions, parentLinks, childLinks, spouses, birthOrders };
}

/** Blood parents (biological or adopted), deduplicated. */
function bloodParents(g: Graph, id: string): string[] {
  const out: string[] = [];
  for (const l of g.parentLinks.get(id) ?? []) {
    if (l.relation !== "step" && !out.includes(l.parentId)) out.push(l.parentId);
  }
  return out;
}

function bloodChildren(g: Graph, id: string): string[] {
  const out: string[] = [];
  for (const l of g.childLinks.get(id) ?? []) {
    if (l.relation !== "step" && !out.includes(l.childId)) out.push(l.childId);
  }
  return out;
}

function ancestry(g: Graph, origin: string, cache: Map<string, Ancestry>): Ancestry {
  const cached = cache.get(origin);
  if (cached) return cached;
  const dist = new Map<string, number>([[origin, 0]]);
  const via = new Map<string, string>();
  const queue = [origin];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    const d = dist.get(cur)!;
    for (const p of bloodParents(g, cur)) {
      if (dist.has(p)) continue;
      dist.set(p, d + 1);
      via.set(p, cur);
      queue.push(p);
    }
  }
  const result = { dist, via };
  cache.set(origin, result);
  return result;
}

function bloodRelation(
  g: Graph,
  a: string,
  b: string,
  cache: Map<string, Ancestry>,
): Blood | null {
  const A = ancestry(g, a, cache);
  const B = ancestry(g, b, cache);
  let best: { ca: string; up: number; down: number } | null = null;
  for (const [anc, down] of B.dist) {
    const up = A.dist.get(anc);
    if (up === undefined) continue;
    if (!best || up + down < best.up + best.down) best = { ca: anc, up, down };
  }
  if (!best) return null;
  const upPath: string[] = [];
  for (let cur: string | undefined = best.ca; cur !== undefined; cur = A.via.get(cur)) {
    upPath.push(cur);
    if (cur === a) break;
  }
  upPath.reverse(); // a ... ca
  const downPath: string[] = [];
  for (let cur: string | undefined = best.ca; cur !== undefined; cur = B.via.get(cur)) {
    downPath.push(cur);
    if (cur === b) break;
  }
  return { up: best.up, down: best.down, path: [...upPath, ...downPath.slice(1)] };
}

// ---------------------------------------------------------------------------
// Helpers

function gender(g: Graph, id: string): Gender {
  return g.persons.get(id)?.gender ?? "unknown";
}

function byGender(g: Graph, id: string, male: string, female: string, neutral: string) {
  const s = gender(g, id);
  return s === "male" ? male : s === "female" ? female : neutral;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

const PRECISION_LEN: Record<string, number> = { day: 10, month: 7, year: 4 };

/** -1 if a is older than b, 1 if younger, 0 if unknown. */
function compareAge(g: Graph, a: string, b: string): -1 | 0 | 1 {
  const pa = g.persons.get(a);
  const pb = g.persons.get(b);
  if (
    pa?.birthDate &&
    pb?.birthDate &&
    pa.birthPrecision !== "unknown" &&
    pb.birthPrecision !== "unknown"
  ) {
    const len = Math.min(
      PRECISION_LEN[pa.birthPrecision] ?? 10,
      PRECISION_LEN[pb.birthPrecision] ?? 10,
    );
    const da = pa.birthDate.slice(0, len);
    const db = pb.birthDate.slice(0, len);
    if (da < db) return -1;
    if (da > db) return 1;
  }
  const oa = g.birthOrders.get(a);
  const ob = g.birthOrders.get(b);
  if (oa && ob) {
    for (const [unionId, orderA] of oa) {
      const orderB = ob.get(unionId);
      if (orderA != null && orderB != null && orderA !== orderB) {
        return orderA < orderB ? -1 : 1;
      }
    }
  }
  return 0;
}

/** "kakak" / "adik" / "saudara": what `sib` is relative to `ref`. */
function siblingWord(g: Graph, sib: string, ref: string) {
  const c = compareAge(g, sib, ref);
  return c < 0 ? "kakak" : c > 0 ? "adik" : "saudara";
}

function parentWord(g: Graph, id: string) {
  return byGender(g, id, "ayah", "ibu", "orang tua");
}

function spouseWord(g: Graph, id: string, union: Union) {
  const w = byGender(g, id, "suami", "istri", "pasangan");
  return union.status === "divorced" ? `mantan ${w}` : w;
}

/** Union linking a and b as partners; prefers a non-divorced one. */
function spouseUnion(g: Graph, a: string, b: string): Union | null {
  let found: Union | null = null;
  for (const s of g.spouses.get(a) ?? []) {
    if (s.spouseId !== b) continue;
    if (!found || (found.status === "divorced" && s.union.status !== "divorced")) found = s.union;
  }
  return found;
}

function isAdoptedLink(g: Graph, child: string, parent: string) {
  const links = (g.parentLinks.get(child) ?? []).filter((l) => l.parentId === parent);
  return links.length > 0 && links.every((l) => l.relation === "adopted");
}

function childSharesUnion(g: Graph, a: string, b: string) {
  const oa = g.birthOrders.get(a);
  const ob = g.birthOrders.get(b);
  if (!oa || !ob) return false;
  for (const u of oa.keys()) {
    if (!ob.has(u)) continue;
    const link = (g.parentLinks.get(a) ?? []).find((l) => l.unionId === u);
    const linkB = (g.parentLinks.get(b) ?? []).find((l) => l.unionId === u);
    if (link?.relation !== "step" && linkB?.relation !== "step") return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Blood labels

function ancestorLabel(g: Graph, me: string, target: string, n: number): string {
  switch (n) {
    case 1: {
      const base = byGender(g, target, "Ayah", "Ibu", "Orang tua");
      return isAdoptedLink(g, me, target) ? `${base} angkat` : base;
    }
    case 2:
      return byGender(g, target, "Kakek", "Nenek", "Kakek/nenek");
    case 3:
      return byGender(g, target, "Kakek buyut", "Nenek buyut", "Buyut");
    case 4:
      return "Canggah";
    case 5:
      return "Wareng";
    default:
      return `Leluhur generasi ke-${n}`;
  }
}

function descendantLabel(g: Graph, me: string, target: string, n: number): string {
  switch (n) {
    case 1:
      return isAdoptedLink(g, target, me) ? "Anak angkat" : "Anak";
    case 2:
      return "Cucu";
    case 3:
      return "Cicit";
    case 4:
      return "Piut";
    default:
      return `Keturunan generasi ke-${n}`;
  }
}

function siblingLabel(g: Graph, me: string, target: string): string {
  const mine = bloodParents(g, me);
  const theirs = bloodParents(g, target);
  const shared = mine.filter((p) => theirs.includes(p));
  const full = shared.length >= 2 || (shared.length === 1 && childSharesUnion(g, me, target));
  if (!full) {
    const p = shared[0];
    return p
      ? byGender(g, p, "Saudara seayah", "Saudara seibu", "Saudara satu orang tua")
      : "Saudara";
  }
  const c = compareAge(g, target, me);
  if (c === 0) return "Saudara kandung";
  const base = c < 0 ? "Kakak" : "Adik";
  return base + byGender(g, target, " laki-laki", " perempuan", "");
}

function cousinLabel(n: number): string {
  // n = generations up (= down) to the common ancestor, n >= 2
  if (n === 2) return "Sepupu";
  const times = ["", "", "", "dua", "tiga", "empat", "lima"][n] ?? String(n - 1);
  return `Sepupu ${times} kali`;
}

function bloodLabel(g: Graph, me: string, target: string, rel: Blood): string {
  const { up, down, path } = rel;
  if (up === 0 && down === 0) return "Diri sendiri";
  if (down === 0) return ancestorLabel(g, me, target, up);
  if (up === 0) return descendantLabel(g, me, target, down);
  if (up === 1 && down === 1) return siblingLabel(g, me, target);
  if (up === down) return cousinLabel(up);
  if (up === 2 && down === 1) {
    const parent = path[1];
    const base = byGender(g, target, "Paman", "Bibi", "Paman/bibi");
    return `${base} (${siblingWord(g, target, parent)} ${parentWord(g, parent)})`;
  }
  if (up === 1 && down === 2) {
    const sibling = path[2];
    return `Keponakan (anak ${siblingWord(g, sibling, me)})`;
  }
  if (up === 3 && down === 1) {
    return "Saudara " + byGender(g, path[2], "kakek", "nenek", "kakek/nenek");
  }
  if (up === 1 && down === 3) return "Cucu saudara";
  if (up === 3 && down === 2) return `Sepupu ${parentWord(g, path[1])}`;
  if (up === 2 && down === 3) return "Anak sepupu";
  return `Kerabat sedarah (${up} generasi ke atas, ${down} ke bawah)`;
}

// ---------------------------------------------------------------------------
// Affinal

function stepParent(g: Graph, me: string, target: string): string[] | null {
  const myParents = bloodParents(g, me);
  if (myParents.includes(target)) return null;
  // Explicit step link: I'm a step child of a union where target is a partner.
  for (const l of g.parentLinks.get(me) ?? []) {
    if (l.relation === "step" && l.parentId === target) return [me, target];
  }
  // Implicit: target is a spouse of one of my parents.
  for (const p of myParents) {
    if (spouseUnion(g, p, target)) return [me, p, target];
  }
  return null;
}

function namedAffinal(g: Graph, me: string, target: string): KinshipResult | null {
  // Step parent / step child
  const sp = stepParent(g, me, target);
  if (sp) {
    return {
      label: byGender(g, target, "Ayah tiri", "Ibu tiri", "Orang tua tiri"),
      path: sp,
      blood: false,
    };
  }
  const sc = stepParent(g, target, me);
  if (sc) return { label: "Anak tiri", path: [...sc].reverse(), blood: false };

  const mySpouses = (g.spouses.get(me) ?? []).map((s) => s.spouseId);
  const targetSpouses = (g.spouses.get(target) ?? []).map((s) => s.spouseId);

  // Mertua: parent of my spouse
  for (const s of mySpouses) {
    if (bloodParents(g, s).includes(target)) {
      return {
        label: byGender(g, target, "Ayah mertua", "Ibu mertua", "Mertua"),
        path: [me, s, target],
        blood: false,
      };
    }
  }
  // Menantu: spouse of my child
  for (const c of bloodChildren(g, me)) {
    if (targetSpouses.includes(c)) return { label: "Menantu", path: [me, c, target], blood: false };
  }
  // Ipar: spouse of my sibling
  const myParents = bloodParents(g, me);
  for (const s of targetSpouses) {
    const shared = bloodParents(g, s).find((p) => myParents.includes(p));
    if (shared && s !== me) {
      return { label: iparLabel(g, s, me), path: [me, shared, s, target], blood: false };
    }
  }
  // Ipar: sibling of my spouse
  const targetParents = bloodParents(g, target);
  for (const s of mySpouses) {
    const shared = bloodParents(g, s).find((p) => targetParents.includes(p));
    if (shared && s !== target) {
      return { label: iparLabel(g, target, s), path: [me, s, shared, target], blood: false };
    }
  }
  // Besan: parent of my child's spouse
  for (const c of bloodChildren(g, me)) {
    for (const cs of g.spouses.get(c) ?? []) {
      if (bloodParents(g, cs.spouseId).includes(target)) {
        return { label: "Besan", path: [me, c, cs.spouseId, target], blood: false };
      }
    }
  }
  return null;
}

/** sib is the sibling in the sibling relation, ref the other side. */
function iparLabel(g: Graph, sib: string, ref: string) {
  const c = compareAge(g, sib, ref);
  return c < 0 ? "Kakak ipar" : c > 0 ? "Adik ipar" : "Ipar";
}

function genericAffinal(
  g: Graph,
  me: string,
  target: string,
  cache: Map<string, Ancestry>,
): KinshipResult | null {
  let best: { score: number; result: KinshipResult } | null = null;
  // Target is the spouse of my blood relative X.
  for (const { spouseId: x, union } of g.spouses.get(target) ?? []) {
    if (x === me) continue;
    const rel = bloodRelation(g, me, x, cache);
    if (!rel) continue;
    const score = rel.up + rel.down;
    if (best && best.score <= score) continue;
    const label = `${capitalize(spouseWord(g, target, union))} dari ${lowerFirst(bloodLabel(g, me, x, rel))}`;
    best = { score, result: { label, path: [...rel.path, target], blood: false } };
  }
  // Target is a blood relative of my spouse Y.
  for (const { spouseId: y, union } of g.spouses.get(me) ?? []) {
    if (y === target) continue;
    const rel = bloodRelation(g, y, target, cache);
    if (!rel) continue;
    const score = rel.up + rel.down;
    if (best && best.score <= score) continue;
    const label = `${bloodLabel(g, y, target, rel)} dari ${spouseWord(g, y, union)}`;
    best = { score, result: { label, path: [me, ...rel.path], blood: false } };
  }
  return best?.result ?? null;
}

/** Any path at all through parent, child, and spouse links. */
function anyPath(g: Graph, me: string, target: string): string[] | null {
  const prev = new Map<string, string | null>([[me, null]]);
  const queue = [me];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur === target) break;
    const next = [
      ...(g.parentLinks.get(cur) ?? []).map((l) => l.parentId),
      ...(g.childLinks.get(cur) ?? []).map((l) => l.childId),
      ...(g.spouses.get(cur) ?? []).map((s) => s.spouseId),
    ];
    for (const n of next) {
      if (prev.has(n)) continue;
      prev.set(n, cur);
      queue.push(n);
    }
  }
  if (!prev.has(target)) return null;
  const path: string[] = [];
  for (let cur: string | null = target; cur !== null; cur = prev.get(cur) ?? null) path.push(cur);
  return path.reverse();
}

// ---------------------------------------------------------------------------

export function describeKinship(
  data: TreeData,
  meId: string,
  targetId: string,
): KinshipResult | null {
  const g = buildGraph(data);
  if (!g.persons.has(meId) || !g.persons.has(targetId)) return null;
  if (meId === targetId) return { label: "Diri sendiri", path: [meId], blood: true };

  const union = spouseUnion(g, meId, targetId);
  if (union) {
    return {
      label: capitalize(spouseWord(g, targetId, union)),
      path: [meId, targetId],
      blood: false,
    };
  }

  const cache = new Map<string, Ancestry>();
  const rel = bloodRelation(g, meId, targetId, cache);
  if (rel) return { label: bloodLabel(g, meId, targetId, rel), path: rel.path, blood: true };

  const named = namedAffinal(g, meId, targetId);
  if (named) return named;

  const generic = genericAffinal(g, meId, targetId, cache);
  if (generic) return generic;

  const path = anyPath(g, meId, targetId);
  if (path) return { label: "Kerabat jauh (melalui pernikahan)", path, blood: false };
  return null;
}
