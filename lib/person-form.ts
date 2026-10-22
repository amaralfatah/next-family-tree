import { z } from "zod";
import { composeDate } from "@/lib/dates";
import type { PersonInput } from "@/lib/tree/service";

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
