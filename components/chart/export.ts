import type { FamilyGraph } from "@/lib/graph/build";
import type { Positions } from "@/lib/graph/layout";
import { chartToSvg } from "@/lib/graph/svg";
import type { Person } from "@/lib/types";

const PAPER_MM: Record<"a4" | "a3" | "a2" | "a1", [number, number]> = {
  a4: [210, 297],
  a3: [297, 420],
  a2: [420, 594],
  a1: [594, 841],
};

/** Browsers cap canvas size; stay well under the smallest common limit. */
const MAX_CANVAS_SIDE = 12_000;

function download(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

async function rasterize(svg: string, width: number, height: number, scale: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Exports every node of the current chart (not only what is on screen). */
export async function exportChart(opts: {
  kind: "png" | "pdf" | "svg";
  paper?: keyof typeof PAPER_MM;
  graph: FamilyGraph;
  positions: Positions;
  persons: Map<string, Person>;
  mePersonId: string | null;
  title: string;
  fileName: string;
}) {
  const { svg, width, height } = chartToSvg(opts);

  if (opts.kind === "svg") {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    download(url, `${opts.fileName}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }

  if (opts.kind === "png") {
    const scale = Math.max(1, Math.min(3, MAX_CANVAS_SIDE / Math.max(width, height)));
    const blob = await rasterize(svg, width, height, scale);
    const url = URL.createObjectURL(blob);
    download(url, `${opts.fileName}.png`);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }

  // PDF: rasterize at ~200 dpi for the chosen paper, then place it centered with margins.
  const paper = opts.paper ?? "a3";
  const [shortSide, longSide] = PAPER_MM[paper];
  const landscape = width >= height;
  const pageW = landscape ? longSide : shortSide;
  const pageH = landscape ? shortSide : longSide;
  const margin = 8;
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2;
  const mm = Math.min(availW / width, availH / height);
  const targetPx = (Math.max(width, height) * mm * 200) / 25.4;
  const scale = Math.max(0.5, Math.min(MAX_CANVAS_SIDE / Math.max(width, height), targetPx / Math.max(width, height)));
  const blob = await rasterize(svg, width, height, scale);
  const dataUrl = await new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(blob);
  });
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: paper });
  const w = width * mm;
  const h = height * mm;
  pdf.addImage(dataUrl, "PNG", margin + (availW - w) / 2, margin + (availH - h) / 2, w, h, undefined, "FAST");
  pdf.save(`${opts.fileName}-${paper}.pdf`);
}
