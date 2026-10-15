import ELK from "elkjs/lib/elk.bundled.js";
import { describe, expect, it } from "vitest";
import type { Person, TreeData } from "@/lib/types";
import { buildDescendantGraph } from "./build";
import { positionsFromElk, toElk } from "./layout";
import { chartToSvg } from "./svg";

const person = (id: string, fullName: string, extra: Partial<Person> = {}): Person => ({
  id,
  fullName,
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
  ...extra,
});

describe("chartToSvg", () => {
  it("draws every person, escapes names, and marks the deceased", async () => {
    const data: TreeData = {
      persons: [person("a", "H. Abdullah <Aki>", { isLiving: false, gender: "male" }), person("b", "Siti & Aminah"), person("c", "Ahmad")],
      unions: [{ id: "u", partnerAId: "a", partnerBId: "b", status: "married", startDate: null, orderIndex: 0 }],
      children: [{ unionId: "u", childId: "c", relation: "biological", birthOrder: 1 }],
    };
    const graph = buildDescendantGraph(data, "a");
    const positions = positionsFromElk(await new ELK().layout(toElk(graph)));
    const { svg, width, height } = chartToSvg({ graph, positions, persons: new Map(data.persons.map((p) => [p.id, p])), title: "Bani <Test>" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("H. Abdullah &lt;Aki&gt;");
    expect(svg).toContain("Siti &amp; Aminah");
    expect(svg).toContain("Bani &lt;Test&gt;");
    expect(svg).toContain("Alm.");
    expect(svg.match(/<path /g)?.length).toBe(graph.edges.length);
    expect(width).toBeGreaterThan(200);
    expect(height).toBeGreaterThan(200);
  });
});
