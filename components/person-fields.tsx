"use client";

import { useState } from "react";
import { CheckRow, DisclosureRow, FormGroup, FormRow, RowSelect, SwitchRow, rowInput } from "@/components/form-rows";
import { MONTH_NAMES, splitDate } from "@/lib/dates";
import type { Person } from "@/lib/types";

type Defaults = Partial<Pick<Person, "fullName" | "nickname" | "gender" | "birthDate" | "birthPrecision" | "birthPlace" | "isLiving" | "deathDate" | "deathPrecision" | "notes">>;

const GENDERS = [
  ["male", "Laki-laki"],
  ["female", "Perempuan"],
  ["unknown", "Tidak diketahui"],
] as const;

/**
 * The person fields shared by "new tree", "add relative", and "edit person", as an iOS grouped form: each
 * group one card of rows, no boxes inside it (components/form-rows.tsx). The rows fit any width, from the
 * chart's inspector to a full page.
 */
export function PersonFields({ defaults = {}, idPrefix = "p" }: { defaults?: Defaults; idPrefix?: string }) {
  const [deceased, setDeceased] = useState(defaults.isLiving === false);
  const birth = splitDate(defaults.birthDate ?? null, defaults.birthPrecision ?? "unknown");
  const death = splitDate(defaults.deathDate ?? null, defaults.deathPrecision ?? "unknown");
  const id = (s: string) => `${idPrefix}-${s}`;

  return (
    <div className="grid min-w-0 gap-6">
      <FormGroup>
        <FormRow label="Nama lengkap" htmlFor={id("fullName")}>
          <input id={id("fullName")} name="fullName" required maxLength={160} autoComplete="off" defaultValue={defaults.fullName ?? ""} placeholder="Wajib diisi" className={rowInput} />
        </FormRow>
        <FormRow label="Nama panggilan" htmlFor={id("nickname")}>
          <input id={id("nickname")} name="nickname" maxLength={60} autoComplete="off" defaultValue={defaults.nickname ?? ""} placeholder="mis. Aki Dullah" className={rowInput} />
        </FormRow>
      </FormGroup>

      <FormGroup title="Jenis kelamin">
        {GENDERS.map(([value, label]) => (
          <CheckRow key={value} id={id(`gender-${value}`)} name="gender" value={value} label={label} defaultChecked={(defaults.gender ?? "unknown") === value} />
        ))}
      </FormGroup>

      <FormGroup footer="Tanggal boleh hanya tahun, atau dikosongkan.">
        <DateRow legend="Tanggal lahir" prefix="birth" values={birth} idPrefix={idPrefix} />
        <FormRow label="Tempat lahir" htmlFor={id("birthPlace")}>
          <input id={id("birthPlace")} name="birthPlace" maxLength={120} autoComplete="off" defaultValue={defaults.birthPlace ?? ""} placeholder="mis. Tasikmalaya" className={rowInput} />
        </FormRow>
      </FormGroup>

      <FormGroup>
        <SwitchRow label="Sudah wafat" id={id("deceased")} name="deceased" value="on" checked={deceased} onChange={(e) => setDeceased(e.target.checked)} />
        {/* Turned on just now: open the date straight away, it is the next thing to fill in. */}
        {deceased ? <DateRow legend="Tanggal wafat" prefix="death" values={death} idPrefix={idPrefix} defaultOpen={defaults.isLiving !== false} /> : null}
      </FormGroup>

      <FormGroup title="Catatan">
        <textarea
          id={id("notes")}
          name="notes"
          aria-label="Catatan"
          rows={3}
          maxLength={4000}
          defaultValue={defaults.notes ?? ""}
          placeholder="Pekerjaan, kisah singkat, tempat dimakamkan…"
          className="block min-h-24 w-full resize-y bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:bg-accent/40"
        />
      </FormGroup>
    </div>
  );
}

/** A date row: the date as text, tapped open to day, month and year rows. Any of the three may stay empty. */
export function DateRow({ legend, prefix, values, idPrefix, defaultOpen }: { legend: string; prefix: string; values: { year: string; month: string; day: string }; idPrefix: string; defaultOpen?: boolean }) {
  const id = (s: string) => `${idPrefix}-${prefix}-${s}`;
  const [day, setDay] = useState(values.day);
  const [month, setMonth] = useState(values.month);
  const [year, setYear] = useState(values.year);
  const shown = [day.trim(), month ? MONTH_NAMES[Number(month) - 1] : "", year.trim()].filter(Boolean).join(" ");
  return (
    <DisclosureRow label={legend} value={shown} placeholder="Belum diisi" defaultOpen={defaultOpen}>
      <FormRow label="Tanggal" htmlFor={id("day")}>
        <input id={id("day")} name={`${prefix}Day`} inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" placeholder="1–31" value={day} onChange={(e) => setDay(e.target.value)} className={rowInput} />
      </FormRow>
      <FormRow label="Bulan" htmlFor={id("month")}>
        <RowSelect id={id("month")} name={`${prefix}Month`} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">Tidak diketahui</option>
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </RowSelect>
      </FormRow>
      <FormRow label="Tahun" htmlFor={id("year")}>
        <input id={id("year")} name={`${prefix}Year`} inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="off" placeholder="mis. 1950" value={year} onChange={(e) => setYear(e.target.value)} className={rowInput} />
      </FormRow>
    </DisclosureRow>
  );
}
