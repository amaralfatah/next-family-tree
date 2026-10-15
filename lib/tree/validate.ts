import { yearOf } from "@/lib/dates";
import type { Person, TreeData } from "@/lib/types";

/** Children of each person, across every union they belong to. */
function childrenIndex(data: TreeData): Map<string, string[]> {
  const unionPartners = new Map<string, string[]>();
  for (const u of data.unions) unionPartners.set(u.id, [u.partnerAId, u.partnerBId].filter(Boolean) as string[]);
  const index = new Map<string, string[]>();
  for (const c of data.children) {
    for (const parent of unionPartners.get(c.unionId) ?? []) {
      const list = index.get(parent) ?? [];
      list.push(c.childId);
      index.set(parent, list);
    }
  }
  return index;
}

export function descendantsOf(data: TreeData, personId: string): Set<string> {
  const index = childrenIndex(data);
  const seen = new Set<string>();
  const stack = [...(index.get(personId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(index.get(id) ?? []));
  }
  return seen;
}

/**
 * Making `childId` a child of `parentIds` creates a cycle when the child is one of the
 * parents or already an ancestor of one of them.
 */
export function wouldCreateCycle(data: TreeData, parentIds: string[], childId: string): boolean {
  if (parentIds.includes(childId)) return true;
  const desc = descendantsOf(data, childId);
  return parentIds.some((p) => desc.has(p));
}

/** Two people can't be partners if one descends from the other (or they are the same). */
export function invalidPartners(data: TreeData, a: string, b: string): string | null {
  if (a === b) return "Seseorang tidak bisa menjadi pasangan dirinya sendiri.";
  if (descendantsOf(data, a).has(b) || descendantsOf(data, b).has(a)) {
    return "Pasangan tidak boleh keturunan langsung dari pasangannya.";
  }
  return null;
}

/** Non-blocking warnings shown on a profile when dates don't add up. */
export function dateWarnings(data: TreeData, personId: string): string[] {
  const byId = new Map(data.persons.map((p) => [p.id, p]));
  const person = byId.get(personId);
  if (!person) return [];
  const warnings: string[] = [];
  const born = yearOf(person.birthDate, person.birthPrecision);
  const died = yearOf(person.deathDate, person.deathPrecision);
  if (born && died && died < born) warnings.push("Tanggal wafat lebih awal dari tanggal lahir.");
  if (person.isLiving && born && new Date().getFullYear() - born > 120) {
    warnings.push("Tercatat masih hidup, tetapi lahir lebih dari 120 tahun lalu.");
  }

  const unionById = new Map(data.unions.map((u) => [u.id, u]));
  const parents = (childId: string): Person[] =>
    data.children
      .filter((c) => c.childId === childId && c.relation === "biological")
      .flatMap((c) => {
        const u = unionById.get(c.unionId);
        return u ? [u.partnerAId, u.partnerBId] : [];
      })
      .map((id) => (id ? byId.get(id) : undefined))
      .filter((p): p is Person => Boolean(p));

  for (const parent of parents(personId)) {
    const pb = yearOf(parent.birthDate, parent.birthPrecision);
    const pd = yearOf(parent.deathDate, parent.deathPrecision);
    const name = parent.nickname || parent.fullName;
    if (born && pb && born <= pb) warnings.push(`Lahir sebelum orang tuanya (${name}) lahir.`);
    else if (born && pb && born - pb < 12) warnings.push(`Selisih usia dengan ${name} kurang dari 12 tahun.`);
    // A father may die before the child is born, so allow one year of slack.
    if (born && pd && born > pd + 1) warnings.push(`Lahir setelah ${name} wafat.`);
  }

  for (const c of data.children) {
    const u = unionById.get(c.unionId);
    if (!u || c.relation !== "biological" || (u.partnerAId !== personId && u.partnerBId !== personId)) continue;
    const child = byId.get(c.childId);
    const cb = child ? yearOf(child.birthDate, child.birthPrecision) : null;
    if (child && born && cb && cb <= born) warnings.push(`Anaknya (${child.nickname || child.fullName}) lahir lebih dulu.`);
  }
  return [...new Set(warnings)];
}
