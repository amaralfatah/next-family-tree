import { describe, expect, it } from "vitest";
import type { Person, TreeData } from "@/lib/types";
import { DRAFT_ID, withDraft, type Draft } from "./draft";

function person(id: string): Person {
  return {
    id,
    fullName: id,
    nickname: null,
    gender: "unknown",
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

// ayah + ibu (u1) → anak, kakak; anak + istri (u2); nenek alone (u3) → ayah
const base: TreeData = {
  persons: ["ayah", "ibu", "anak", "kakak", "istri", "nenek"].map(person),
  unions: [
    { id: "u1", partnerAId: "ayah", partnerBId: "ibu", status: "married", startDate: null, orderIndex: 0 },
    { id: "u2", partnerAId: "anak", partnerBId: "istri", status: "married", startDate: null, orderIndex: 0 },
    { id: "u3", partnerAId: "nenek", partnerBId: null, status: "unknown", startDate: null, orderIndex: 0 },
  ],
  children: [
    { unionId: "u1", childId: "kakak", relation: "biological", birthOrder: 1 },
    { unionId: "u1", childId: "anak", relation: "biological", birthOrder: 2 },
    { unionId: "u3", childId: "ayah", relation: "biological", birthOrder: 1 },
  ],
};

const add = (relation: Extract<Draft, { kind: "add" }>["relation"], existingId: string | null = null): Draft => ({ kind: "add", relation, name: "Baru", gender: "female", existingId });

describe("withDraft", () => {
  it("leaves the tree alone without a draft", () => {
    expect(withDraft(base, null)).toBe(base);
  });

  it("adds a sibling to the person's biological parents at the chosen place", () => {
    const next = withDraft(base, add({ kind: "sibling", ofId: "anak", birthOrder: 1 }));
    expect(next.persons.find((p) => p.id === DRAFT_ID)?.fullName).toBe("Baru");
    expect(next.children).toContainEqual({ unionId: "u1", childId: DRAFT_ID, relation: "biological", birthOrder: 1 });
    expect(next.children.filter((c) => c.unionId === "u1").map((c) => [c.childId, c.birthOrder])).toEqual([
      ["kakak", 2],
      ["anak", 3],
      [DRAFT_ID, 1],
    ]);
  });

  it("draws no sibling when the person has no parents yet", () => {
    const next = withDraft(base, add({ kind: "sibling", ofId: "nenek" }));
    expect(next.children.some((c) => c.childId === DRAFT_ID)).toBe(false);
  });

  it("puts a child in the chosen union, after the last child by default", () => {
    const next = withDraft(base, add({ kind: "child", ofId: "ayah", unionId: "u1" }));
    expect(next.children).toContainEqual({ unionId: "u1", childId: DRAFT_ID, relation: "biological", birthOrder: 3 });
  });

  it("fills the empty slot of a single-parent union with the new parent", () => {
    const next = withDraft(base, add({ kind: "parent", ofId: "ayah" }));
    expect(next.unions.find((u) => u.id === "u3")?.partnerBId).toBe(DRAFT_ID);
  });

  it("adds a second, adoptive pair of parents next to the biological one", () => {
    const next = withDraft(base, add({ kind: "parent", ofId: "anak", childRelation: "adopted" }));
    const union = next.unions.find((u) => u.partnerAId === DRAFT_ID);
    expect(union).toBeDefined();
    expect(next.children).toContainEqual({ unionId: union!.id, childId: "anak", relation: "adopted", birthOrder: 1 });
  });

  it("draws no third biological parent", () => {
    const next = withDraft(base, add({ kind: "parent", ofId: "anak" }));
    expect(next.unions).toEqual(base.unions);
  });

  it("links someone already in the tree instead of a placeholder", () => {
    const next = withDraft(base, add({ kind: "partner", ofId: "kakak", unionStatus: "divorced" }, "istri"));
    expect(next.persons).toBe(base.persons);
    expect(next.unions).toContainEqual(expect.objectContaining({ partnerAId: "kakak", partnerBId: "istri", status: "divorced" }));
  });

  it("shows edits to a name before they are saved", () => {
    const next = withDraft(base, { kind: "edit", personId: "anak", name: "Anak Baru", nickname: "Ade", gender: "male" });
    expect(next.persons.find((p) => p.id === "anak")).toMatchObject({ fullName: "Anak Baru", nickname: "Ade", gender: "male" });
  });
});
