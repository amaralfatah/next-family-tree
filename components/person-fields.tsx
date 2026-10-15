"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MONTH_NAMES, splitDate } from "@/lib/dates";
import type { Person } from "@/lib/types";

type Defaults = Partial<Pick<Person, "fullName" | "nickname" | "gender" | "birthDate" | "birthPrecision" | "birthPlace" | "isLiving" | "deathDate" | "deathPrecision" | "notes">>;

/** The person fields shared by "new tree", "add relative", and "edit person". */
export function PersonFields({ defaults = {}, idPrefix = "p" }: { defaults?: Defaults; idPrefix?: string }) {
  const [deceased, setDeceased] = useState(defaults.isLiving === false);
  const birth = splitDate(defaults.birthDate ?? null, defaults.birthPrecision ?? "unknown");
  const death = splitDate(defaults.deathDate ?? null, defaults.deathPrecision ?? "unknown");
  const id = (s: string) => `${idPrefix}-${s}`;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <div className="space-y-1.5">
          <Label htmlFor={id("fullName")}>Nama lengkap</Label>
          <Input id={id("fullName")} name="fullName" required maxLength={160} defaultValue={defaults.fullName ?? ""} placeholder="mis. H. Abdullah bin Umar" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("nickname")}>Nama panggilan</Label>
          <Input id={id("nickname")} name="nickname" maxLength={60} defaultValue={defaults.nickname ?? ""} placeholder="mis. Aki Dullah" />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Jenis kelamin</legend>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["male", "Laki-laki"],
              ["female", "Perempuan"],
              ["unknown", "Tidak diketahui"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-10 cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-sm leading-tight transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] has-checked:border-soga has-checked:bg-accent has-checked:font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input type="radio" name="gender" value={value} defaultChecked={(defaults.gender ?? "unknown") === value} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <DateParts legend="Tanggal lahir" prefix="birth" values={birth} idPrefix={idPrefix} />
      <div className="space-y-1.5">
        <Label htmlFor={id("birthPlace")}>Tempat lahir</Label>
        <Input id={id("birthPlace")} name="birthPlace" maxLength={120} defaultValue={defaults.birthPlace ?? ""} placeholder="mis. Tasikmalaya" />
      </div>

      <div className="space-y-3 rounded-xl border border-dashed p-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
          <input
            type="checkbox"
            name="deceased"
            checked={deceased}
            onChange={(e) => setDeceased(e.target.checked)}
            className="size-4 accent-[var(--soga)]"
          />
          Sudah wafat
        </label>
        {deceased ? <DateParts legend="Tanggal wafat" prefix="death" values={death} idPrefix={idPrefix} /> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={id("notes")}>Catatan</Label>
        <Textarea id={id("notes")} name="notes" rows={3} maxLength={4000} defaultValue={defaults.notes ?? ""} placeholder="Pekerjaan, kisah singkat, tempat dimakamkan, dsb." />
      </div>
    </div>
  );
}

export function DateParts({
  legend,
  prefix,
  values,
  idPrefix,
}: {
  legend: string;
  prefix: string;
  values: { year: string; month: string; day: string };
  idPrefix: string;
}) {
  const id = (s: string) => `${idPrefix}-${prefix}-${s}`;
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">
        {legend} <span className="font-normal text-muted-foreground">(boleh hanya tahun, atau kosongkan)</span>
      </legend>
      <div className="grid grid-cols-[5rem_1fr_6rem] gap-2">
        <Input id={id("day")} name={`${prefix}Day`} inputMode="numeric" pattern="[0-9]*" maxLength={2} placeholder="Tgl" aria-label={`${legend}: tanggal`} defaultValue={values.day} />
        <select id={id("month")} name={`${prefix}Month`} className="field" aria-label={`${legend}: bulan`} defaultValue={values.month}>
          <option value="">Bulan</option>
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <Input id={id("year")} name={`${prefix}Year`} inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="Tahun" aria-label={`${legend}: tahun`} defaultValue={values.year} />
      </div>
    </fieldset>
  );
}
