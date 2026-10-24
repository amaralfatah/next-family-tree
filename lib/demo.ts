import type { DB } from "@/lib/db";
import { changeLog, persons, treeMembers, trees, unionChildren, unions } from "@/lib/db/schema";
import { encodeSummary } from "@/lib/log-summary";
import type { Gender, TreeData } from "@/lib/types";
import type { PersonInput } from "@/lib/tree/service";

// A fictional four-generation Sundanese family (~100 people) for trying the app and
// checking chart performance. Deterministic, so every run looks the same.

const MALE = ["Asep", "Dadang", "Ujang", "Cecep", "Dede", "Agus", "Yayan", "Iwan", "Hendra", "Rudi", "Budi", "Eko", "Fajar", "Gilang", "Rizky", "Dimas", "Yusuf", "Ahmad"];
const FEMALE = ["Euis", "Neneng", "Imas", "Cucu", "Popon", "Yati", "Siti", "Rina", "Lilis", "Nining", "Wulan", "Dewi", "Fitri", "Ayu", "Nisa", "Salma", "Aminah", "Fatimah"];
const PLACES = ["Tasikmalaya", "Garut", "Ciamis", "Bandung", "Sumedang", "Cianjur", "Jakarta", "Bogor"];

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export async function createDemoTree(db: DB, userId: string): Promise<string> {
  const rand = rng(42);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const thisYear = new Date().getFullYear();
  const person = (name: string, gender: Gender, birthYear: number, deathYear?: number): PersonInput => {
    // A death year that is still in the future means the person is alive.
    if (deathYear && deathYear > thisYear) deathYear = undefined;
    return {
      fullName: name,
      nickname: null,
      gender,
      birthDate: `${birthYear}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`,
      birthPrecision: rand() < 0.3 ? "year" : "day",
      birthPlace: pick(PLACES),
      isLiving: !deathYear,
      deathDate: deathYear ? `${deathYear}-01-01` : null,
      deathPrecision: deathYear ? "year" : "unknown",
      notes: null,
    };
  };

  // The whole family is built in memory and written in one transaction: going through createPerson
  // costs ~10 round-trips per person, which is a minute against a remote database.
  const treeName = "Bani H. Abdullah (contoh)";
  const treeId = crypto.randomUUID();
  const start = Date.now();
  // Rows get increasing timestamps so the chart and history keep the order they were added in.
  const at = (i: number) => new Date(start + i);
  const people: (typeof persons.$inferInsert)[] = [];
  const added: { id: string; input: PersonInput }[] = [];
  const unionRows: (typeof unions.$inferInsert)[] = [];
  const childRows: (typeof unionChildren.$inferInsert)[] = [];

  const add = (input: PersonInput) => {
    const id = crypto.randomUUID();
    people.push({ ...input, id, treeId, createdAt: at(people.length) });
    added.push({ id, input });
    return id;
  };
  const marry = (partnerAId: string, partnerBId: string) => {
    const id = crypto.randomUUID();
    const orderIndex = unionRows.filter((u) => u.partnerAId === partnerAId || u.partnerBId === partnerAId).length;
    unionRows.push({ id, treeId, partnerAId, partnerBId, status: "married", orderIndex });
    return id;
  };
  const addChild = (unionId: string, childId: string) => {
    const birthOrder = childRows.filter((c) => c.unionId === unionId).length + 1;
    childRows.push({ unionId, childId, relation: "biological", birthOrder });
  };

  const root = add({ ...person("H. Abdullah", "male", 1928, 2001), nickname: "Aki Dullah", birthPlace: "Tasikmalaya" });
  const rootUnion = marry(root, add({ ...person("Hj. Siti Aminah", "female", 1932, 2010), nickname: "Nini" }));

  function family(parentId: string, parentGender: Gender, birthYear: number, generation: number) {
    const spouseGender: Gender = parentGender === "male" ? "female" : "male";
    const spouseName = `${pick(spouseGender === "male" ? MALE : FEMALE)} ${pick(["Suryana", "Hidayat", "Rahayu", "Permana", "Lestari", "Nugraha"])}`;
    const spouseBirth = birthYear + Math.floor(rand() * 4) - 1;
    const union = marry(parentId, add(person(spouseName, spouseGender, spouseBirth, generation < 2 && rand() < 0.5 ? spouseBirth + 70 : undefined)));
    const kids = generation === 0 ? 5 : generation === 1 ? 3 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 2);
    let year = birthYear + 22 + Math.floor(rand() * 5);
    for (let i = 0; i < kids; i++) {
      const gender: Gender = rand() < 0.5 ? "male" : "female";
      const name = `${pick(gender === "male" ? MALE : FEMALE)} ${pick(["", "Nurdin", "Saepudin", "Komariah", "Mulyana", "Kurniasih"])}`.trim();
      const childId = add(person(name, gender, year, generation === 0 && rand() < 0.3 ? year + 65 : undefined));
      addChild(union, childId);
      if (generation < 2 && year < 2000) family(childId, gender, year, generation + 1);
      year += 2 + Math.floor(rand() * 3);
    }
  }

  let year = 1950;
  for (let i = 0; i < 5; i++) {
    const gender: Gender = i % 2 === 0 ? "male" : "female";
    const childId = add(person(`${gender === "male" ? MALE[i + 10] : FEMALE[i + 10]} Abdullah`, gender, year));
    addChild(rootUnion, childId);
    family(childId, gender, year, 1);
    year += 3;
  }

  // Same history as adding everyone by hand: the tree, then one entry per person after the first.
  const logs: (typeof changeLog.$inferInsert)[] = [
    { treeId, userId, entity: "tree", entityId: treeId, action: "create", summary: encodeSummary("treeCreated", { name: treeName }), createdAt: at(0) },
    ...added.slice(1).map(({ id, input }, i) => ({
      treeId,
      userId,
      entity: "person",
      entityId: id,
      action: "create",
      summary: encodeSummary("personAdded", { name: input.fullName }),
      diff: { after: input },
      createdAt: at(i + 1),
    })),
  ];

  await db.transaction(async (tx) => {
    await tx.insert(trees).values({ id: treeId, ownerId: userId, name: treeName, description: "Pohon contoh berisi keluarga fiktif empat generasi.", rootPersonId: root });
    await tx.insert(persons).values(people);
    await tx.insert(treeMembers).values({ treeId, userId, role: "owner", personId: null });
    await tx.insert(unions).values(unionRows);
    await tx.insert(unionChildren).values(childRows);
    await tx.insert(changeLog).values(logs);
  });
  return treeId;
}

/**
 * Where a visitor lands in the demo family: "me" is the youngest person whose parent (by blood) has both
 * parents and siblings in the tree, the chart is centred on my grandparent so the first view shows three
 * generations, and an aunt or uncle is pre-selected so a kinship label shows without a tap.
 */
export function demoView(data: TreeData): { focusId: string; meId: string; relativeId: string } {
  const parentsOf = (id: string) => {
    const unionIds = data.children.filter((c) => c.childId === id).map((c) => c.unionId);
    return data.unions.filter((u) => unionIds.includes(u.id)).flatMap((u) => [u.partnerAId, u.partnerBId].filter((p): p is string => Boolean(p)));
  };
  const siblingsOf = (id: string) => {
    const unionIds = data.children.filter((c) => c.childId === id).map((c) => c.unionId);
    return data.children.filter((c) => unionIds.includes(c.unionId) && c.childId !== id).map((c) => c.childId);
  };

  const youngestFirst = [...data.persons].sort((a, b) => (b.birthDate ?? "").localeCompare(a.birthDate ?? ""));
  for (const me of youngestFirst) {
    for (const parent of parentsOf(me.id)) {
      const grandparent = parentsOf(parent)[0];
      // The parent's closest sibling by age sits next to them on the chart, so the soga route stays short.
      const born = (id: string) => Number((data.persons.find((p) => p.id === id)?.birthDate ?? "0").slice(0, 4));
      const relative = siblingsOf(parent).sort((x, y) => Math.abs(born(x) - born(parent)) - Math.abs(born(y) - born(parent)))[0];
      if (grandparent && relative) return { focusId: grandparent, meId: me.id, relativeId: relative };
    }
  }
  throw new Error("Demo tree has no three-generation line");
}
