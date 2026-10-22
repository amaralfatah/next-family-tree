"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { MONTH_NAMES, splitDate } from "@/lib/dates";
import type { Person } from "@/lib/types";

type Defaults = Partial<Pick<Person, "fullName" | "nickname" | "gender" | "birthDate" | "birthPrecision" | "birthPlace" | "isLiving" | "deathDate" | "deathPrecision" | "notes">>;

const GENDERS = [
  ["male", "Laki-laki"],
  ["female", "Perempuan"],
  ["unknown", "Tidak diketahui"],
] as const;

/** The person fields shared by "new tree", "add relative", and "edit person". */
export function PersonFields({ defaults = {}, idPrefix = "p" }: { defaults?: Defaults; idPrefix?: string }) {
  const [deceased, setDeceased] = useState(defaults.isLiving === false);
  const birth = splitDate(defaults.birthDate ?? null, defaults.birthPrecision ?? "unknown");
  const death = splitDate(defaults.deathDate ?? null, defaults.deathPrecision ?? "unknown");
  const id = (s: string) => `${idPrefix}-${s}`;

  return (
    <FieldGroup>
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <Field>
          <FieldLabel htmlFor={id("fullName")}>Nama lengkap</FieldLabel>
          <Input id={id("fullName")} name="fullName" required maxLength={160} autoComplete="off" defaultValue={defaults.fullName ?? ""} placeholder="mis. H. Abdullah bin Umar…" />
        </Field>
        <Field>
          <FieldLabel htmlFor={id("nickname")}>Nama panggilan</FieldLabel>
          <Input id={id("nickname")} name="nickname" maxLength={60} autoComplete="off" defaultValue={defaults.nickname ?? ""} placeholder="mis. Aki Dullah…" />
        </Field>
      </div>

      <FieldSet>
        <FieldLegend variant="label">Jenis kelamin</FieldLegend>
        <RadioGroup name="gender" defaultValue={defaults.gender ?? "unknown"} className="grid-cols-1 sm:grid-cols-3">
          {GENDERS.map(([value, label]) => (
            <FieldLabel key={value} htmlFor={id(`gender-${value}`)}>
              <Field orientation="horizontal">
                <RadioGroupItem value={value} id={id(`gender-${value}`)} />
                <FieldContent>
                  <FieldTitle className="leading-tight">{label}</FieldTitle>
                </FieldContent>
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </FieldSet>

      <DateParts legend="Tanggal lahir" prefix="birth" values={birth} idPrefix={idPrefix} />
      <Field>
        <FieldLabel htmlFor={id("birthPlace")}>Tempat lahir</FieldLabel>
        <Input id={id("birthPlace")} name="birthPlace" maxLength={120} autoComplete="off" defaultValue={defaults.birthPlace ?? ""} placeholder="mis. Tasikmalaya…" />
      </Field>

      <FieldGroup className="gap-4 rounded-xl border border-dashed p-4">
        <Field orientation="horizontal">
          <Checkbox id={id("deceased")} name="deceased" value="on" checked={deceased} onCheckedChange={setDeceased} />
          <FieldLabel htmlFor={id("deceased")}>Sudah wafat</FieldLabel>
        </Field>
        {deceased ? <DateParts legend="Tanggal wafat" prefix="death" values={death} idPrefix={idPrefix} /> : null}
      </FieldGroup>

      <Field>
        <FieldLabel htmlFor={id("notes")}>Catatan</FieldLabel>
        <Textarea id={id("notes")} name="notes" rows={3} maxLength={4000} defaultValue={defaults.notes ?? ""} placeholder="Pekerjaan, kisah singkat, tempat dimakamkan…" />
      </Field>
    </FieldGroup>
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
    <FieldSet className="gap-0">
      <FieldLegend variant="label">
        {legend} <span className="font-normal text-muted-foreground">(boleh hanya tahun, atau kosongkan)</span>
      </FieldLegend>
      <div className="grid grid-cols-[5rem_1fr_6rem] gap-2">
        <Input id={id("day")} name={`${prefix}Day`} inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" placeholder="Tgl" aria-label={`${legend}: tanggal`} defaultValue={values.day} />
        <NativeSelect id={id("month")} name={`${prefix}Month`} className="w-full" aria-label={`${legend}: bulan`} defaultValue={values.month}>
          <NativeSelectOption value="">Bulan</NativeSelectOption>
          {MONTH_NAMES.map((m, i) => (
            <NativeSelectOption key={m} value={i + 1}>
              {m}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Input id={id("year")} name={`${prefix}Year`} inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="off" placeholder="Tahun" aria-label={`${legend}: tahun`} defaultValue={values.year} />
      </div>
    </FieldSet>
  );
}
