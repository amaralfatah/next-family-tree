import type { RelationSpec } from "@/lib/tree/service";
import type { Gender, Person, TreeData } from "@/lib/types";

/** Id of the placeholder card while someone is being added; never saved. */
export const DRAFT_ID = "draft";
const DRAFT_UNION = "draft-union";

/** What the open add/edit form would change, so the chart can show it before saving. */
export type Draft =
  | { kind: "add"; relation: RelationSpec; name: string; gender: Gender; existingId: string | null }
  | { kind: "edit"; personId: string; name: string; nickname: string | null; gender: Gender };

function placeholder(name: string, gender: Gender): Person {
  return {
    id: DRAFT_ID,
    fullName: name,
    nickname: null,
    gender,
    birthDate: null,
    birthPrecision: "unknown",
    birthPlace: null,
    isLiving: true,
    deathDate: null,
    deathPrecision: "unknown",
    photoKey: null,
    notes: null,
    updatedAt: "",
  };
}

/**
 * The tree as it would be after saving the draft. Mirrors `relate` in the tree service, but never
 * throws: a relation the service would refuse simply isn't drawn.
 */
export function withDraft(data: TreeData, draft: Draft | null): TreeData {
  if (!draft) return data;
  if (draft.kind === "edit") {
    return {
      ...data,
      persons: data.persons.map((p) => (p.id === draft.personId ? { ...p, fullName: draft.name || p.fullName, nickname: draft.nickname, gender: draft.gender } : p)),
    };
  }

  const rel = draft.relation;
  if (!data.persons.some((p) => p.id === rel.ofId)) return data;
  const otherId = draft.existingId ?? DRAFT_ID;
  if (otherId === rel.ofId) return data;
  const persons = draft.existingId ? data.persons : [...data.persons, placeholder(draft.name, draft.gender)];
  let unions = data.unions;
  let children = data.children;
  const childRelation = rel.childRelation ?? "biological";
  const soloOf = (id: string) => unions.find((u) => u.partnerAId === id && u.partnerBId === null);
  const newUnion = (partnerAId: string, partnerBId: string | null) => {
    unions = [...unions, { id: DRAFT_UNION, partnerAId, partnerBId, status: rel.unionStatus ?? (partnerBId ? "married" : "unknown"), startDate: null, orderIndex: 99 }];
    return DRAFT_UNION;
  };
  const fill = (unionId: string, partnerBId: string) => {
    unions = unions.map((u) => (u.id === unionId ? { ...u, partnerBId, status: rel.unionStatus ?? u.status } : u));
  };
  const addChild = (unionId: string, childId: string, birthOrder?: number | null) => {
    if (children.some((c) => c.unionId === unionId && c.childId === childId)) return;
    const order = birthOrder ?? children.filter((c) => c.unionId === unionId).length + 1;
    if (birthOrder) children = children.map((c) => (c.unionId === unionId && c.birthOrder !== null && c.birthOrder >= birthOrder ? { ...c, birthOrder: c.birthOrder + 1 } : c));
    children = [...children, { unionId, childId, relation: childRelation, birthOrder: order }];
  };

  if (rel.kind === "partner") {
    const solo = soloOf(rel.ofId);
    if (solo) fill(solo.id, otherId);
    else newUnion(rel.ofId, otherId);
  } else if (rel.kind === "child") {
    const given = rel.unionId ? unions.find((u) => u.id === rel.unionId) : undefined;
    addChild(given?.id ?? soloOf(rel.ofId)?.id ?? newUnion(rel.ofId, null), otherId, rel.birthOrder);
  } else if (rel.kind === "parent") {
    const links = children.filter((c) => c.childId === rel.ofId && c.relation === childRelation);
    const open = links.map((l) => unions.find((u) => u.id === l.unionId)).find((u) => u && u.partnerBId === null);
    if (open) fill(open.id, otherId);
    else if (links.length === 0 || childRelation !== "biological") addChild(newUnion(otherId, null), rel.ofId);
  } else {
    const link = children.find((c) => c.childId === rel.ofId && c.relation === "biological");
    if (link) addChild(link.unionId, otherId, rel.birthOrder);
  }
  return { persons, unions, children };
}
