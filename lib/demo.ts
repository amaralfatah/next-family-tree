import type { DB } from "@/lib/db";
import type { Gender } from "@/lib/types";
import { createPerson, createTree, loadTreeData, type PersonInput } from "@/lib/tree/service";

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

  const treeId = await createTree(db, userId, {
    name: "Bani H. Abdullah (contoh)",
    description: "Pohon contoh berisi keluarga fiktif empat generasi.",
    firstPerson: { ...person("H. Abdullah", "male", 1928, 2001), nickname: "Aki Dullah", birthPlace: "Tasikmalaya" },
    isMe: false,
  });
  const root = (await loadTreeData(db, userId, treeId)).persons[0].id;
  await createPerson(db, userId, treeId, { ...person("Hj. Siti Aminah", "female", 1932, 2010), nickname: "Nini" }, { kind: "partner", ofId: root });

  async function family(parentId: string, parentGender: Gender, birthYear: number, generation: number) {
    const spouseGender: Gender = parentGender === "male" ? "female" : "male";
    const spouseName = `${pick(spouseGender === "male" ? MALE : FEMALE)} ${pick(["Suryana", "Hidayat", "Rahayu", "Permana", "Lestari", "Nugraha"])}`;
    const spouseBirth = birthYear + Math.floor(rand() * 4) - 1;
    await createPerson(db, userId, treeId, person(spouseName, spouseGender, spouseBirth, generation < 2 && rand() < 0.5 ? spouseBirth + 70 : undefined), { kind: "partner", ofId: parentId });
    const data = await loadTreeData(db, userId, treeId);
    const union = data.unions.find((u) => (u.partnerAId === parentId || u.partnerBId === parentId) && u.partnerBId !== null)!;
    const kids = generation === 0 ? 5 : generation === 1 ? 3 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 2);
    let year = birthYear + 22 + Math.floor(rand() * 5);
    for (let i = 0; i < kids; i++) {
      const gender: Gender = rand() < 0.5 ? "male" : "female";
      const name = `${pick(gender === "male" ? MALE : FEMALE)} ${pick(["", "Nurdin", "Saepudin", "Komariah", "Mulyana", "Kurniasih"])}`.trim();
      const childId = await createPerson(
        db,
        userId,
        treeId,
        person(name, gender, year, generation === 0 && rand() < 0.3 ? year + 65 : undefined),
        { kind: "child", ofId: parentId, unionId: union.id },
      );
      if (generation < 2 && year < 2000) await family(childId, gender, year, generation + 1);
      year += 2 + Math.floor(rand() * 3);
    }
  }

  const data = await loadTreeData(db, userId, treeId);
  const union = data.unions[0];
  let year = 1950;
  for (let i = 0; i < 5; i++) {
    const gender: Gender = i % 2 === 0 ? "male" : "female";
    const childId = await createPerson(db, userId, treeId, person(`${gender === "male" ? MALE[i + 10] : FEMALE[i + 10]} Abdullah`, gender, year), {
      kind: "child",
      ofId: root,
      unionId: union.id,
    });
    await family(childId, gender, year, 1);
    year += 3;
  }
  return treeId;
}
