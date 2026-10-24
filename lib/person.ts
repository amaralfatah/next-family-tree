import { lifespan } from "@/lib/dates";
import type { Person } from "@/lib/types";

/** "Alm." / "Almh." marks the deceased in Indonesian families; English says "Deceased". */
export function deceasedMark(p: Pick<Person, "isLiving" | "gender">, locale = "id"): string | null {
  if (p.isLiving) return null;
  if (locale === "en") return "Deceased";
  return p.gender === "female" ? "Almh." : "Alm.";
}

export function subtitle(p: Person, locale = "id"): string {
  return [deceasedMark(p, locale), lifespan(p, locale)].filter(Boolean).join(" · ");
}

/** @deprecated Indonesian only. Use `useTranslations("person")` / `getTranslations("person")` and `labels.role.<role>`. */
export const ROLE_LABEL = { owner: "Pemilik", editor: "Editor", viewer: "Pembaca" } as const;

export function photoUrl(treeId: string, p: Pick<Person, "id" | "photoKey">): string | null {
  return p.photoKey ? `/api/photos/${treeId}/${p.id}?v=${encodeURIComponent(p.photoKey.slice(-12))}` : null;
}
