import "server-only";
import { z } from "zod";
import { AccessError } from "@/lib/access";
import { requireUser } from "@/lib/auth/session";
import { getDb, type DB } from "@/lib/db";
import { composeDate } from "@/lib/dates";
import { UserError } from "@/lib/errors";
import type { PersonInput } from "@/lib/tree/service";

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string; conflict?: boolean };

/** Runs a service call as the signed-in user and turns known errors into messages. */
export async function run<T>(fn: (db: DB, userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const user = await requireUser();
  try {
    const data = await fn(await getDb(), user.id);
    return { ok: true, data } as ActionResult<T>;
  } catch (e) {
    if (e instanceof AccessError || e instanceof UserError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Data tidak valid." };
    throw e;
  }
}

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

export { get as formValue };
