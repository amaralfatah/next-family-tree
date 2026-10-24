import { z } from "zod";
import { composeDate } from "@/lib/dates";
import type { PersonInput, RelationSpec } from "@/lib/tree/service";
import type { ChildRelation } from "@/lib/types";

// Shared by the server actions and the in-browser /demo sandbox, so both validate a person the same way.

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .transform((v) => (v === "" ? null : v));

const personSchema = z.object({
  fullName: z.string().trim().min(1, "Nama lengkap wajib diisi.").max(160, "Nama terlalu panjang."),
  nickname: text(60),
  gender: z.enum(["male", "female", "unknown"]),
  birthPlace: text(120),
  notes: text(4000),
});

const get = (fd: FormData, k: string) => (fd.get(k) ?? "").toString();

export function parsePerson(fd: FormData): PersonInput {
  const base = personSchema.parse({
    fullName: get(fd, "fullName"),
    nickname: get(fd, "nickname"),
    gender: get(fd, "gender") || "unknown",
    birthPlace: get(fd, "birthPlace"),
    notes: get(fd, "notes"),
  });
  const birth = composeDate(get(fd, "birthYear"), get(fd, "birthMonth"), get(fd, "birthDay"));
  const isLiving = get(fd, "deceased") !== "on";
  const death = isLiving ? { date: null, precision: "unknown" as const } : composeDate(get(fd, "deathYear"), get(fd, "deathMonth"), get(fd, "deathDay"));
  return {
    ...base,
    birthDate: birth.date,
    birthPrecision: birth.precision,
    isLiving,
    deathDate: death.date,
    deathPrecision: death.precision,
  };
}

const relationSchema = z.object({
  kind: z.enum(["parent", "partner", "child", "sibling"]),
  ofId: z.uuid(),
  unionId: z.uuid().nullable(),
  childRelation: z.enum(["biological", "adopted", "step"]),
  unionStatus: z.enum(["married", "divorced", "widowed", "unknown"]),
  birthOrder: z.coerce.number().int("Urutan lahir harus bilangan bulat.").min(1, "Urutan lahir mulai dari 1.").max(99, "Urutan lahir terlalu besar.").nullable(),
});

/** The `relKind`/`relOf` fields of an "add relative" form; undefined when the form adds no relation. */
export function parseRelation(fd: FormData): RelationSpec | undefined {
  if (!get(fd, "relKind")) return undefined;
  return relationSchema.parse({
    kind: get(fd, "relKind"),
    ofId: get(fd, "relOf"),
    unionId: get(fd, "relUnion") || null,
    childRelation: get(fd, "childRelation") || "biological",
    unionStatus: get(fd, "unionStatus") || "married",
    birthOrder: get(fd, "birthOrder").trim() || null,
  });
}

const ORDER = "order:";

/**
 * The "Anak ke-" fields of an edit form, one per parent union (`order:<unionId>`), with the link's
 * relation and old value beside them. Only the ones that changed come back.
 */
export function parseBirthOrders(fd: FormData): { unionId: string; relation: ChildRelation; birthOrder: number | null }[] {
  const changed = [];
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith(ORDER)) continue;
    const unionId = z.uuid().parse(key.slice(ORDER.length));
    const raw = value.toString().trim();
    const birthOrder = raw ? relationSchema.shape.birthOrder.parse(raw) : null;
    if (String(birthOrder ?? "") === get(fd, `orderWas:${unionId}`)) continue;
    changed.push({ unionId, relation: relationSchema.shape.childRelation.parse(get(fd, `orderRel:${unionId}`)), birthOrder });
  }
  return changed;
}
