import { subtitle } from "@/lib/person";
import type { Person } from "@/lib/types";
import type { FamilyGraph } from "./build";
import { nodeSize, PERSON_H, PERSON_W, type Positions } from "./layout";

// Print palette: always light, whatever theme the viewer uses on screen.
const C = {
  paper: "#fbf7f0",
  card: "#ffffff",
  deceased: "#f4eee4",
  border: "#e2d8c9",
  ink: "#2f2419",
  muted: "#7a6a58",
  line: "#7d86b3",
  soga: "#b5652d",
  nila: "#3f4f8f",
};
const SANS = "'Plus Jakarta Sans','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF = "'Instrument Serif',Georgia,'Times New Roman',serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Rough fit: names longer than the card get an ellipsis instead of overflowing. */
function fit(text: string, maxChars: number) {
  return text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text;
}

function initials(name: string) {
  return name
    .replace(/^(H|Hj|Dr|Ir|Drs|Prof)\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Draws the laid-out chart as a standalone SVG (no DOM, no fonts to fetch), so export
 * is fast for big trees and stays sharp when printed at A1.
 */
export function chartToSvg(opts: {
  graph: FamilyGraph;
  positions: Positions;
  persons: Map<string, Person>;
  title: string;
  mePersonId?: string | null;
}): { svg: string; width: number; height: number } {
  const { graph, positions, persons, title, mePersonId } = opts;
  const PAD = 48;
  const HEADER = 72;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of graph.nodes) {
    const p = positions[n.id];
    if (!p) continue;
    const s = nodeSize(n);
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + s.width);
    maxY = Math.max(maxY, p.y + s.height);
  }
  if (!Number.isFinite(minX)) {
    minX = minY = 0;
    maxX = PERSON_W;
    maxY = PERSON_H;
  }
  const width = Math.ceil(maxX - minX + PAD * 2);
  const height = Math.ceil(maxY - minY + PAD * 2 + HEADER);
  const ox = PAD - minX;
  const oy = PAD + HEADER - minY;

  const box = (id: string) => {
    const n = graph.nodes.find((x) => x.id === id);
    const p = positions[id];
    if (!n || !p) return null;
    const s = nodeSize(n);
    return { x: p.x + ox, y: p.y + oy, w: s.width, h: s.height };
  };

  const edges = graph.edges
    .map((e) => {
      const a = box(e.source);
      const b = box(e.target);
      if (!a || !b) return "";
      const sx = a.x + a.w / 2;
      const sy = a.y + a.h;
      const tx = b.x + b.w / 2;
      const ty = b.y;
      const mid = Math.round((sy + ty) / 2);
      const dash = e.relation === "adopted" ? ' stroke-dasharray="6 4"' : e.relation === "step" ? ' stroke-dasharray="2 4"' : "";
      return `<path d="M${sx} ${sy}V${mid}H${tx}V${ty}" fill="none" stroke="${C.line}" stroke-width="1.5"${dash}/>`;
    })
    .join("");

  const nodes = graph.nodes
    .map((n) => {
      const b = box(n.id);
      if (!b) return "";
      if (n.kind === "union") {
        const fill = n.status === "divorced" ? C.paper : C.nila;
        return `<circle cx="${b.x + b.w / 2}" cy="${b.y + b.h / 2}" r="5" fill="${fill}" stroke="${C.nila}" stroke-width="2"/>`;
      }
      if (n.kind === "unknown") {
        return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="none" stroke="${C.border}" stroke-dasharray="4 3"/><text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 4}" text-anchor="middle" font-family="${SANS}" font-size="11" fill="${C.muted}">Tidak diketahui</text>`;
      }
      const p = persons.get(n.personId);
      if (!p) return "";
      const accent = p.gender === "female" ? C.soga : p.gender === "male" ? C.nila : C.border;
      const isMe = p.id === mePersonId;
      const lines = [
        `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="12" fill="${p.isLiving ? C.card : C.deceased}" stroke="${n.focus || isMe ? C.soga : C.border}" stroke-width="${n.focus || isMe ? 1.8 : 1}"/>`,
        `<rect x="${b.x}" y="${b.y + 9}" width="3" height="${b.h - 18}" rx="1.5" fill="${accent}"/>`,
        `<circle cx="${b.x + 32}" cy="${b.y + b.h / 2}" r="20" fill="${C.paper}" stroke="${C.border}"/>`,
        `<text x="${b.x + 32}" y="${b.y + b.h / 2 + 4}" text-anchor="middle" font-family="${SANS}" font-size="12" font-weight="700" fill="${C.muted}">${esc(initials(p.fullName))}</text>`,
        `<text x="${b.x + 62}" y="${b.y + (p.nickname ? 26 : 32)}" font-family="${SANS}" font-size="13" font-weight="700" fill="${C.ink}">${esc(fit(p.fullName, 18))}</text>`,
      ];
      if (p.nickname) {
        lines.push(`<text x="${b.x + 62}" y="${b.y + 41}" font-family="${SANS}" font-size="11" fill="${C.muted}">“${esc(fit(p.nickname, 18))}”</text>`);
      }
      const sub = subtitle(p);
      if (sub) lines.push(`<text x="${b.x + 62}" y="${b.y + (p.nickname ? 56 : 50)}" font-family="${SANS}" font-size="11" fill="${C.muted}">${esc(sub)}</text>`);
      if (n.hiddenCount > 0) {
        lines.push(
          `<rect x="${b.x + b.w / 2 - 18}" y="${b.y + b.h - 8}" width="36" height="16" rx="8" fill="${C.card}" stroke="${C.border}"/><text x="${b.x + b.w / 2}" y="${b.y + b.h + 4}" text-anchor="middle" font-family="${SANS}" font-size="9.5" fill="${C.muted}">+${n.hiddenCount}</text>`,
        );
      }
      return lines.join("");
    })
    .join("");

  const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="${C.paper}"/>
<text x="${PAD}" y="${PAD + 18}" font-family="${SERIF}" font-size="34" fill="${C.ink}">${esc(title)}</text>
<text x="${PAD}" y="${PAD + 42}" font-family="${SANS}" font-size="12" fill="${C.muted}">Silsilah keluarga · dicetak dari Wargi · ${esc(date)}</text>
${edges}${nodes}
</svg>`;
  return { svg, width, height };
}
