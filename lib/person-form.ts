import { z } from "zod";
import { composeDate } from "@/lib/dates";
import { UserError } from "@/lib/errors";
import type { PersonInput, RelationSpec } from "@/lib/tree/service";
import type { ChildRelation } from "@/lib/types";

// Shared by the server actions and the in-browser /demo sandbox, so both validate a person the same way.
// Issue messages are keys in the `errors` namespace (see lib/error-message.ts); `maxChars<N>` exists for 60, 120 and 4000.

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `person.maxChars${max}`)
    .transform((v) => (v === "" ? null : v));

const personSchema = z.object({
  fullName: z.string().trim().min(1, "person.fullNameRequired").max(160, "person.fullNameTooLong"),
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
  const birth = checkedDate(get(fd, "birthYear"), get(fd, "birthMonth"), get(fd, "birthDay"), "birth");
  const isLiving = get(fd, "deceased") !== "on";
  const death = isLiving ? { date: null, precision: "unknown" as const } : checkedDate(get(fd, "deathYear"), get(fd, "deathMonth"), get(fd, "deathDay"), "death");
  return {
    ...base,
    birthDate: birth.date,
    birthPrecision: birth.precision,
    isLiving,
    deathDate: death.date,
    deathPrecision: death.precision,
  };
}

/**
 * A date row's day, month and year. composeDate keeps only what it can place (a day needs a month, a month a
 * year), so anything typed that it would drop is refused here instead of vanishing on save.
 */
export function checkedDate(rawYear: string, rawMonth: string, rawDay: string, field: "birth" | "death" | "start") {
  const [year, month, day] = [rawYear.trim(), rawMonth.trim(), rawDay.trim()];
  if (day && !month) throw new UserError("person.dateNeedsMonth", { field });
  if ((day || month) && !year) throw new UserError("person.dateNeedsYear", { field });
  const date = composeDate(year, month, day);
  const wanted = day ? "day" : month ? "month" : year ? "year" : "unknown";
  if (date.precision !== wanted) throw new UserError("person.dateInvalid", { field });
  return date;
}

const relationSchema = z.object({
  kind: z.enum(["parent", "partner", "child", "sibling"]),
  ofId: z.uuid(),
  unionId: z.uuid().nullable(),
  childRelation: z.enum(["biological", "adopted", "step"]),
  unionStatus: z.enum(["married", "divorced", "widowed", "unknown"]),
  birthOrder: z.coerce.number().int("person.birthOrderInteger").min(1, "person.birthOrderMin").max(99, "person.birthOrderMax").nullable(),
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
 * The "Child number" (anak ke-) fields of an edit form, one per parent union (`order:<unionId>`), with the link's
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
