import type { ChildRelation, Person, TreeData, Union } from "@/lib/types";

export interface ParentGroup {
  union: Union;
  relation: ChildRelation;
  parents: Person[];
  /** other children of the same union */
  siblings: { person: Person; relation: ChildRelation }[];
}

export interface OwnUnion {
  union: Union;
  partner: Person | null;
  children: { person: Person; relation: ChildRelation; birthOrder: number | null }[];
}

/** Immediate family of one person, grouped the way the profile page shows it. */
export function familyOf(data: TreeData, personId: string) {
  const byId = new Map(data.persons.map((p) => [p.id, p]));
  const unionById = new Map(data.unions.map((u) => [u.id, u]));
  const childrenOf = (unionId: string) => data.children.filter((c) => c.unionId === unionId);

  const parentGroups: ParentGroup[] = data.children
    .filter((c) => c.childId === personId)
    .map((link) => {
      const union = unionById.get(link.unionId)!;
      return {
        union,
        relation: link.relation,
        parents: [union.partnerAId, union.partnerBId].map((id) => (id ? byId.get(id) : undefined)).filter((p): p is Person => Boolean(p)),
        siblings: childrenOf(union.id)
          .filter((c) => c.childId !== personId)
          .map((c) => ({ person: byId.get(c.childId)!, relation: c.relation }))
          .filter((s) => s.person),
      };
    })
    .filter((g) => g.union);

  const own: OwnUnion[] = data.unions
    .filter((u) => u.partnerAId === personId || u.partnerBId === personId)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((union) => {
      const partnerId = union.partnerAId === personId ? union.partnerBId : union.partnerAId;
      return {
        union,
        partner: partnerId ? (byId.get(partnerId) ?? null) : null,
        children: childrenOf(union.id)
          .map((c) => ({ person: byId.get(c.childId)!, relation: c.relation, birthOrder: c.birthOrder }))
          .filter((c) => c.person)
          .sort((a, b) => (a.birthOrder ?? 99) - (b.birthOrder ?? 99)),
      };
    });

  return { parentGroups, own };
}
