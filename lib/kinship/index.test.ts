import { describe, it, expect } from "vitest";
import { describeKinship } from "./index";
import type { ChildRelation, Gender, Person, TreeData, UnionStatus } from "../types";

type Kid = string | [id: string, relation?: ChildRelation, birthOrder?: number | null];

/** Concise TreeData builder. */
function tree() {
  const data: TreeData = { persons: [], unions: [], children: [] };
  const api = {
    data,
    /** p("id", "m"|"f"|"u", "1980-01-01" | "1980") */
    p(id: string, g: "m" | "f" | "u" = "u", birth?: string) {
      const gender: Gender = g === "m" ? "male" : g === "f" ? "female" : "unknown";
      const person: Person = {
        id,
        fullName: id,
        nickname: null,
        gender,
        birthDate: birth ? (birth.length === 4 ? `${birth}-01-01` : birth) : null,
        birthPrecision: birth ? (birth.length === 4 ? "year" : "day") : "unknown",
        birthPlace: null,
        isLiving: true,
        deathDate: null,
        deathPrecision: "unknown",
        photoKey: null,
        notes: null,
        updatedAt: "2026-01-01T00:00:00Z",
      };
      data.persons.push(person);
      return api;
    },
    u(a: string, b: string | null, kids: Kid[] = [], status: UnionStatus = "married") {
      const id = `u${data.unions.length}`;
      data.unions.push({
        id,
        partnerAId: a,
        partnerBId: b,
        status,
        startDate: null,
        orderIndex: data.unions.length,
      });
      for (const k of kids) {
        const [childId, relation = "biological", birthOrder = null] = typeof k === "string" ? [k] : k;
        data.children.push({ unionId: id, childId, relation, birthOrder });
      }
      return api;
    },
  };
  return api;
}

// A four-generation family centered on "me".
const t = tree()
  // great-grandparents (father's side)
  .p("ggf", "m").p("ggm", "f")
  .p("gf", "m", "1920").p("gm", "f", "1922").p("ggSib", "m")
  .u("ggf", "ggm", ["gf", "ggSib"])
  .p("ggSibKid", "f").p("ggSibGrand", "u")
  .u("ggSib", null, ["ggSibKid"])
  .u("ggSibKid", null, ["ggSibGrand"])
  // paternal grandparents
  .p("uncleOld", "m", "1945").p("father", "m", "1950").p("auntYoung", "f", "1955")
  .u("gf", "gm", ["uncleOld", "father", "auntYoung"])
  .p("uncleWife", "f").p("cousin", "m").p("cousinKid", "f")
  .u("uncleOld", "uncleWife", ["cousin"])
  .u("cousin", null, ["cousinKid"])
  .p("auntKid", "f")
  .u("auntYoung", null, ["auntKid"]) // single-parent union
  // maternal grandparents
  .p("mgf", "m").p("mgm", "f").p("mother", "f", "1955").p("motherSis", "f", "1960")
  .u("mgf", "mgm", ["mother", "motherSis"])
  // father's earlier, divorced marriage
  .p("ex", "f").p("halfBro", "m").p("exKid", "u")
  .u("father", "ex", ["halfBro", ["exKid", "step"]], "divorced")
  // my parents
  .p("me", "m", "1980").p("sisOld", "f", "1975").p("broYoung", "m", "1985").p("sibUnknown", "u")
  .u("father", "mother", ["sisOld", "me", "broYoung", "sibUnknown"])
  // ordered only by birthOrder
  .p("x1", "f").p("x2", "m").p("xp", "m")
  .u("xp", null, [["x1", "biological", 1], ["x2", "biological", 2]])
  // sister's family
  .p("sisHusband", "m").p("niece", "f").p("nieceKid", "m")
  .u("sisOld", "sisHusband", ["niece"])
  .u("niece", null, ["nieceKid"])
  // wife's family
  .p("wifeFather", "m").p("wifeMother", "f").p("wife", "f", "1982").p("wifeBro", "m", "1990")
  .p("wifeGf", "m").p("wifeUncle", "m")
  .u("wifeGf", null, ["wifeFather", "wifeUncle"])
  .u("wifeFather", "wifeMother", ["wife", "wifeBro"])
  .p("wifeEx", "m").p("stepKid", "u")
  .u("wifeEx", "wife", ["stepKid"], "divorced")
  // my marriages
  .p("exWife", "f")
  .u("me", "exWife", [], "divorced")
  .p("son", "m").p("adoptedDaughter", "f")
  .u("me", "wife", ["son", ["adoptedDaughter", "adopted"]])
  .p("dil", "f").p("dilFather", "m").p("grandson", "m").p("ggrandson", "m")
  .u("dilFather", null, ["dil"])
  .u("son", "dil", ["grandson"])
  .u("grandson", null, ["ggrandson"])
  // unrelated
  .p("stranger", "u").data;

const cases: [me: string, target: string, label: string | null, blood?: boolean][] = [
  ["me", "me", "Diri sendiri", true],
  ["me", "father", "Ayah", true],
  ["me", "mother", "Ibu", true],
  ["me", "gf", "Kakek", true],
  ["me", "gm", "Nenek", true],
  ["me", "ggf", "Kakek buyut", true],
  ["me", "ggm", "Nenek buyut", true],
  ["me", "sisOld", "Kakak perempuan", true],
  ["me", "broYoung", "Adik laki-laki", true],
  ["me", "sibUnknown", "Saudara kandung", true],
  ["x2", "x1", "Kakak perempuan", true],
  ["x1", "x2", "Adik laki-laki", true],
  ["me", "halfBro", "Saudara seayah", true],
  ["me", "uncleOld", "Paman (kakak ayah)", true],
  ["me", "auntYoung", "Bibi (adik ayah)", true],
  ["me", "motherSis", "Bibi (adik ibu)", true],
  ["me", "cousin", "Sepupu", true],
  ["me", "auntKid", "Sepupu", true],
  ["me", "ggSib", "Saudara kakek", true],
  ["me", "ggSibKid", "Sepupu ayah", true],
  ["me", "ggSibGrand", "Sepupu dua kali", true],
  ["me", "cousinKid", "Anak sepupu", true],
  ["me", "niece", "Keponakan (anak kakak)", true],
  ["me", "nieceKid", "Cucu saudara", true],
  ["uncleOld", "me", "Keponakan (anak adik)", true],
  ["me", "son", "Anak", true],
  ["me", "grandson", "Cucu", true],
  ["me", "ggrandson", "Cicit", true],
  ["ggrandson", "me", "Kakek buyut", true],
  ["me", "adoptedDaughter", "Anak angkat", true],
  ["adoptedDaughter", "me", "Ayah angkat", true],
  ["adoptedDaughter", "gf", "Kakek buyut", true],
  ["me", "wife", "Istri", false],
  ["wife", "me", "Suami", false],
  ["me", "exWife", "Mantan istri", false],
  ["me", "wifeFather", "Ayah mertua", false],
  ["me", "wifeMother", "Ibu mertua", false],
  ["wifeFather", "me", "Menantu", false],
  ["me", "dil", "Menantu", false],
  ["me", "dilFather", "Besan", false],
  ["me", "sisHusband", "Kakak ipar", false],
  ["sisHusband", "me", "Adik ipar", false],
  ["me", "wifeBro", "Adik ipar", false],
  ["me", "ex", "Ibu tiri", false],
  ["stepKid", "me", "Ayah tiri", false],
  ["me", "stepKid", "Anak tiri", false],
  ["exKid", "father", "Ayah tiri", false],
  ["father", "exKid", "Anak tiri", false],
  ["me", "uncleWife", "Istri dari paman (kakak ayah)", false],
  ["me", "wifeUncle", "Paman (saudara ayah) dari istri", false],
  ["me", "stranger", null],
];

const casesEn: [me: string, target: string, label: string][] = [
  ["me", "me", "Myself"],
  ["me", "father", "Father"],
  ["me", "mother", "Mother"],
  ["me", "gf", "Grandfather"],
  ["me", "gm", "Grandmother"],
  ["me", "ggf", "Great-grandfather"],
  ["me", "ggm", "Great-grandmother"],
  ["me", "sisOld", "Older sister"],
  ["me", "broYoung", "Younger brother"],
  ["me", "sibUnknown", "Sibling"],
  ["x2", "x1", "Older sister"],
  ["x1", "x2", "Younger brother"],
  ["me", "halfBro", "Half-brother (same father)"],
  ["me", "uncleOld", "Uncle (father's older brother)"],
  ["me", "auntYoung", "Aunt (father's younger sister)"],
  ["me", "motherSis", "Aunt (mother's younger sister)"],
  ["me", "cousin", "First cousin"],
  ["me", "ggSib", "Great-uncle (grandfather's brother)"],
  ["me", "ggSibKid", "First cousin once removed (father's cousin)"],
  ["me", "ggSibGrand", "Second cousin"],
  ["me", "cousinKid", "First cousin once removed (cousin's child)"],
  ["me", "niece", "Niece (child of older sister)"],
  ["me", "nieceKid", "Grandnephew"],
  ["uncleOld", "me", "Nephew (child of younger brother)"],
  ["me", "son", "Child"],
  ["me", "grandson", "Grandchild"],
  ["me", "ggrandson", "Great-grandchild"],
  ["ggrandson", "me", "Great-grandfather"],
  ["me", "adoptedDaughter", "Adopted child"],
  ["adoptedDaughter", "me", "Adoptive father"],
  ["me", "wife", "Wife"],
  ["wife", "me", "Husband"],
  ["me", "exWife", "Ex-wife"],
  ["me", "wifeFather", "Father-in-law"],
  ["me", "wifeMother", "Mother-in-law"],
  ["wifeFather", "me", "Son-in-law"],
  ["me", "dil", "Daughter-in-law"],
  ["me", "dilFather", "Co-parent-in-law (parent of child's spouse)"],
  ["me", "sisHusband", "Brother-in-law (older)"],
  ["sisHusband", "me", "Brother-in-law (younger)"],
  ["me", "wifeBro", "Brother-in-law (younger)"],
  ["me", "ex", "Stepmother"],
  ["stepKid", "me", "Stepfather"],
  ["me", "stepKid", "Stepchild"],
  ["me", "uncleWife", "Wife of uncle (father's older brother)"],
  ["me", "wifeUncle", "Uncle (father's brother) of wife"],
];

describe("describeKinship in English", () => {
  it.each(casesEn)("%s -> %s = %s", (me, target, label) => {
    expect(describeKinship(t, me, target, "en")?.label).toBe(label);
  });

  it("uses neutral terms when gender is unknown", () => {
    const d = tree()
      .p("a", "u").p("b", "u").p("c", "u", "1950").p("d", "u", "1940").p("me", "u", "1980")
      .u("a", "b", ["c", "d"])
      .u("c", null, ["me"]).data;
    expect(describeKinship(d, "me", "c", "en")?.label).toBe("Parent");
    expect(describeKinship(d, "me", "a", "en")?.label).toBe("Grandparent");
    expect(describeKinship(d, "me", "d", "en")?.label).toBe("Uncle/aunt (parent's older sibling)");
  });

  it("labels deep generations and returns null for strangers", () => {
    const b = tree();
    for (let i = 0; i <= 7; i++) b.p(`g${i}`, "m");
    for (let i = 0; i < 7; i++) b.u(`g${i}`, null, [`g${i + 1}`]);
    expect(describeKinship(b.data, "g7", "g3", "en")?.label).toBe("Great-great-grandfather");
    expect(describeKinship(b.data, "g7", "g0", "en")?.label).toBe("Ancestor (7 generations up)");
    expect(describeKinship(b.data, "g0", "g6", "en")?.label).toBe("Descendant (6 generations down)");
    expect(describeKinship(t, "me", "stranger", "en")).toBeNull();
  });
});

describe("describeKinship", () => {
  it.each(cases)("%s -> %s = %s", (me, target, label, blood) => {
    const r = describeKinship(t, me, target);
    if (label === null) {
      expect(r).toBeNull();
      return;
    }
    expect(r?.label).toBe(label);
    if (blood !== undefined) expect(r?.blood).toBe(blood);
    expect(r?.path[0]).toBe(me);
    expect(r?.path[r.path.length - 1]).toBe(target);
  });

  it("builds the path through the common ancestor", () => {
    expect(describeKinship(t, "me", "uncleOld")?.path).toEqual(["me", "father", "gf", "uncleOld"]);
    expect(describeKinship(t, "me", "cousin")?.path).toEqual([
      "me", "father", "gf", "uncleOld", "cousin",
    ]);
  });

  it("uses neutral terms when gender is unknown", () => {
    const d = tree()
      .p("a", "u").p("b", "u").p("c", "u", "1950").p("d", "u", "1940").p("me", "u", "1980")
      .u("a", "b", ["c", "d"])
      .u("c", null, ["me"]).data;
    expect(describeKinship(d, "me", "c")?.label).toBe("Orang tua");
    expect(describeKinship(d, "me", "a")?.label).toBe("Kakek/nenek");
    expect(describeKinship(d, "me", "d")?.label).toBe("Paman/bibi (kakak orang tua)");
  });

  it("labels deep generations", () => {
    const b = tree();
    for (let i = 0; i <= 7; i++) b.p(`g${i}`, "m");
    for (let i = 0; i < 7; i++) b.u(`g${i}`, null, [`g${i + 1}`]);
    expect(describeKinship(b.data, "g7", "g3")?.label).toBe("Canggah");
    expect(describeKinship(b.data, "g7", "g2")?.label).toBe("Wareng");
    expect(describeKinship(b.data, "g7", "g0")?.label).toBe("Leluhur generasi ke-7");
    expect(describeKinship(b.data, "g0", "g4")?.label).toBe("Piut");
    expect(describeKinship(b.data, "g0", "g6")?.label).toBe("Keturunan generasi ke-6");
  });

  it("handles 2,000+ persons quickly", () => {
    const b = tree();
    // two long lines descending from one root couple
    b.p("root", "m").p("rootW", "f").p("a0", "m").p("b0", "m");
    b.u("root", "rootW", ["a0", "b0"]);
    for (let i = 1; i <= 1100; i++) {
      b.p(`a${i}`, "m").p(`b${i}`, "f");
      b.u(`a${i - 1}`, null, [`a${i}`]);
      b.u(`b${i - 1}`, null, [`b${i}`]);
    }
    const start = performance.now();
    const r = describeKinship(b.data, "a1100", "b1100");
    expect(performance.now() - start).toBeLessThan(500);
    expect(r?.label).toBe("Sepupu 1100 kali");
    expect(r?.path.length).toBe(2 * 1101 + 1);
  });
});

// The landing page shows these six rows as examples; keep them true.
describe("landing page examples", () => {
  const f = tree()
    .p("buyut", "m").p("kakek", "m", "1920").p("kakekAdik", "m", "1925")
    .u("buyut", null, ["kakek", "kakekAdik"])
    .p("pamanTua", "m", "1945").p("ayah", "m", "1950")
    .u("kakek", null, ["pamanTua", "ayah"])
    .p("sepupuAyah", "f").u("kakekAdik", null, ["sepupuAyah"])
    .p("anakSepupuAyah", "u").u("sepupuAyah", null, ["anakSepupuAyah"])
    .p("ibu", "f").p("me", "f", "1980").p("adikCewek", "f", "1985")
    .u("ayah", "ibu", ["me", "adikCewek"])
    .p("nenekIbu", "f").p("adikIbu", "m").u("nenekIbu", null, ["ibu", "adikIbu"])
    .p("anakAdikIbu", "u").u("adikIbu", null, ["anakAdikIbu"])
    .p("suamiAdik", "m").u("adikCewek", "suamiAdik")
    .p("suami", "m").u("me", "suami")
    .p("ayahSuami", "m").u("ayahSuami", null, ["suami"])
    .p("anak", "u").u("me", null, ["anak"]) // a separate union keeps the example small
    .p("menantu", "f").u("anak", "menantu")
    .p("ortuMenantu", "u").u("ortuMenantu", null, ["menantu"]).data;

  it.each([
    ["pamanTua", "Paman (kakak ayah)"],
    ["anakAdikIbu", "Sepupu"],
    ["anakSepupuAyah", "Sepupu dua kali"],
    ["suamiAdik", "Adik ipar"],
    ["besan", "Besan"],
  ])("%s → %s", (target, label) => {
    const id = target === "besan" ? "ortuMenantu" : target;
    expect(describeKinship(f, "me", id)?.label).toBe(label);
  });

  it("father of my husband → Ayah mertua", () => {
    expect(describeKinship(f, "me", "ayahSuami")?.label).toBe("Ayah mertua");
  });
});
