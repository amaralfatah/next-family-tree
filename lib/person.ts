import { lifespan } from "@/lib/dates";
import type { Person } from "@/lib/types";

/** "Alm." / "Almh." — how Indonesian families mark the deceased. */
export function deceasedMark(p: Pick<Person, "isLiving" | "gender">): string | null {
  if (p.isLiving) return null;
  return p.gender === "female" ? "Almh." : "Alm.";
}

export function subtitle(p: Person): string {
  return [deceasedMark(p), lifespan(p)].filter(Boolean).join(" · ");
}

export const GENDER_LABEL = { male: "Laki-laki", female: "Perempuan", unknown: "Tidak diketahui" } as const;
export const UNION_STATUS_LABEL = { married: "Menikah", divorced: "Bercerai", widowed: "Salah satu wafat", unknown: "Tidak diketahui" } as const;
export const CHILD_RELATION_LABEL = { biological: "Kandung", adopted: "Angkat", step: "Tiri" } as const;
export const ROLE_LABEL = { owner: "Pemilik", editor: "Editor", viewer: "Pembaca" } as const;

export function photoUrl(treeId: string, p: Pick<Person, "id" | "photoKey">): string | null {
  return p.photoKey ? `/api/foto/${treeId}/${p.id}?v=${encodeURIComponent(p.photoKey.slice(-12))}` : null;
}
