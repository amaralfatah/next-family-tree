import ELK from "elkjs/lib/elk.bundled.js";
import { describe, expect, it } from "vitest";
import type { ChildRelation, Person, TreeData } from "@/lib/types";
import { autoCollapse, buildAncestorGraph, buildDescendantGraph, generations, revealFocus } from "./build";
import { positionsFromElk, toElk } from "./layout";

function tree() {
  const data: TreeData = { persons: [], unions: [], children: [] };
  const api = {
    p(id: string, birth?: string) {
      data.persons.push({
        id,
        fullName: id,
        nickname: null,
        gender: "unknown",
        birthDate: birth ?? null,
        birthPrecision: birth ? "day" : "unknown",
        birthPlace: null,
        isLiving: true,
        deathDate: null,
        deathPrecision: "unknown",
        photoKey: null,
        notes: null,
        updatedAt: "",
      } satisfies Person);
      return api;
    },
    u(id: string, a: string, b: string | null, kids: string[] = [], relation: ChildRelation = "biological", order = 0) {
      data.unions.push({ id, partnerAId: a, partnerBId: b, status: "married", startDate: null, orderIndex: order });
      kids.forEach((k, i) => data.children.push({ unionId: id, childId: k, relation, birthOrder: i + 1 }));
      return api;
    },
    data,
  };
  return api;
}

const ids = (g: { nodes: { id: string }[] }) => g.nodes.map((n) => n.id).sort();

describe("buildDescendantGraph", () => {
  it("places children under each of several marriages", () => {
    const { data } = tree()
      .p("kakek").p("istri1").p("istri2").p("a").p("b").p("c")
      .u("u1", "kakek", "istri1", ["a", "b"], "biological", 0)
      .u("u2", "kakek", "istri2", ["c"], "biological", 1);
    const g = buildDescendantGraph(data, "kakek");
    expect(ids(g)).toEqual(["p:a", "p:b", "p:c", "p:istri1", "p:istri2", "p:kakek", "u:u1", "u:u2"].sort());
    expect(g.edges.filter((e) => e.source === "u:u1").map((e) => e.target)).toEqual(["p:a", "p:b"]);
    expect(g.edges.filter((e) => e.source === "u:u2").map((e) => e.target)).toEqual(["p:c"]);
  });

  it("shows an 'unknown' slot for a single known parent", () => {
    const { data } = tree().p("ibu").p("anak").u("u1", "ibu", null, ["anak"]);
    const g = buildDescendantGraph(data, "ibu");
    expect(g.nodes.some((n) => n.kind === "unknown")).toBe(true);
  });

  it("marks adopted children on the edge", () => {
    const { data } = tree().p("a").p("b").p("c").u("u1", "a", "b", ["c"], "adopted");
    const g = buildDescendantGraph(data, "a");
    expect(g.edges.find((e) => e.target === "p:c")?.relation).toBe("adopted");
  });

  it("sorts siblings by birth date before birth order", () => {
    const { data } = tree().p("a").p("tua", "1950-01-01").p("muda", "1960-01-01").u("u1", "a", null, ["muda", "tua"]);
    const g = buildDescendantGraph(data, "a");
    expect(g.edges.filter((e) => e.kind === "child").map((e) => e.target)).toEqual(["p:tua", "p:muda"]);
  });

  it("collapses a branch and counts what is hidden", () => {
    const { data } = tree().p("a").p("b").p("c").p("d").u("u1", "a", null, ["b"]).u("u2", "b", null, ["c"]).u("u3", "c", null, ["d"]);
    const g = buildDescendantGraph(data, "a", new Set(["b"]));
    expect(ids(g)).not.toContain("p:c");
    const b = g.nodes.find((n) => n.id === "p:b");
    expect(b).toMatchObject({ hiddenCount: 2, collapsible: true });
  });

  it("does not loop on cousin marriages", () => {
    const { data } = tree().p("r").p("x").p("y").p("z").u("u1", "r", null, ["x", "y"]).u("u2", "x", "y", ["z"]);
    const g = buildDescendantGraph(data, "r");
    expect(g.nodes.filter((n) => n.id === "p:z")).toHaveLength(1);
  });
});

describe("revealFocus", () => {
  it("centres on a parent so a new sibling shows, or on the person when they have no parents", () => {
    const { data } = tree().p("ayah").p("ibu").p("a").p("b").p("baru").u("u1", "ayah", "ibu", ["a", "b"]).u("u2", "baru", null, ["ayah"]);
    expect(revealFocus(data, "b")).toBe("ayah");
    expect(revealFocus(data, "baru")).toBe("baru");
  });
});

describe("buildAncestorGraph", () => {
  it("walks up both parents", () => {
    const { data } = tree().p("me").p("ayah").p("ibu").p("kakek").u("u1", "ayah", "ibu", ["me"]).u("u2", "kakek", null, ["ayah"]);
    const g = buildAncestorGraph(data, "me");
    expect(ids(g)).toEqual(["p:ayah", "p:ibu", "p:kakek", "p:me", "u:u1", "u:u2", "x:u2"].sort());
  });
});

describe("autoCollapse and generations", () => {
  it("collapses once the budget is exceeded", () => {
    const t = tree().p("r");
    const kids = Array.from({ length: 10 }, (_, i) => `k${i}`);
    kids.forEach((k) => t.p(k));
    t.u("u", "r", null, kids);
    kids.forEach((k, i) => {
      const gk = Array.from({ length: 10 }, (_, j) => `g${i}-${j}`);
      gk.forEach((g) => t.p(g));
      t.u(`u${i}`, k, null, gk);
    });
    const c = autoCollapse(t.data, "r", 50);
    expect(c.size).toBe(10);
  });

  it("numbers generations from the root", () => {
    const { data } = tree().p("ayah").p("r").p("istri").p("anak").u("u0", "ayah", null, ["r"]).u("u1", "r", "istri", ["anak"]);
    const g = generations(data, "r");
    expect(Object.fromEntries(g)).toEqual({ r: 1, istri: 1, anak: 2, ayah: 0 });
  });
});

describe("layout", () => {
  it("puts children below their parents", async () => {
    const { data } = tree().p("a").p("b").p("c").u("u1", "a", "b", ["c"]);
    const pos = positionsFromElk(await new ELK().layout(toElk(buildDescendantGraph(data, "a"))));
    expect(pos["p:c"].y).toBeGreaterThan(pos["p:a"].y);
    expect(pos["p:a"].y).toBe(pos["p:b"].y);
  });

  it("keeps siblings in birth order when one has several unions", async () => {
    const { data } = tree()
      .p("r").p("s").p("a").p("b").p("as").p("a1")
      .u("u0", "r", "s", ["a", "b"])
      .u("ua", "a", null, ["a1"], "biological", 0)
      .u("ua2", "a", "as", [], "biological", 1);
    const pos = positionsFromElk(await new ELK().layout(toElk(buildDescendantGraph(data, "r"))));
    expect(pos["p:a"].x).toBeLessThan(pos["p:b"].x);
    expect(pos["p:as"].x).toBeLessThan(pos["p:b"].x);
  });

  it("centres the 'unknown' slot on its partner's row", async () => {
    const { data } = tree().p("ibu").p("anak").u("u1", "ibu", null, ["anak"]);
    const pos = positionsFromElk(await new ELK().layout(toElk(buildDescendantGraph(data, "ibu"))));
    expect(pos["x:u1"].y + 20).toBe(pos["p:ibu"].y + 36);
  });

  it("lays out 300 people quickly", async () => {
    const t = tree().p("r");
    let parents = ["r"];
    let n = 1;
    while (n < 300) {
      const next: string[] = [];
      for (const p of parents) {
        const spouse = `s${n}`;
        t.p(spouse);
        const kids = [0, 1, 2].map((i) => `n${n}-${i}`);
        kids.forEach((k) => t.p(k));
        t.u(`u${n}`, p, spouse, kids);
        next.push(...kids);
        n += 4;
        if (n >= 300) break;
      }
      parents = next;
    }
    const start = performance.now();
    await new ELK().layout(toElk(buildDescendantGraph(t.data, "r")));
    expect(performance.now() - start).toBeLessThan(2000);
  });
});
