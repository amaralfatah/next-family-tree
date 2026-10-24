"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { CheckRow, DisclosureRow, FormGroup, FormRow, RowSelect, SwitchRow, rowInput } from "@/components/form-rows";
import { monthNames, splitDate } from "@/lib/dates";
import type { Person } from "@/lib/types";

type Defaults = Partial<Pick<Person, "fullName" | "nickname" | "gender" | "birthDate" | "birthPrecision" | "birthPlace" | "isLiving" | "deathDate" | "deathPrecision" | "notes">>;

const GENDERS = ["male", "female", "unknown"] as const;

/**
 * The person fields shared by "new tree", "add relative", and "edit person", as an iOS grouped form: each
 * group one card of rows, no boxes inside it (components/form-rows.tsx). The rows fit any width, from the
 * chart's inspector to a full page.
 */
export function PersonFields({ defaults = {}, idPrefix = "p" }: { defaults?: Defaults; idPrefix?: string }) {
  const t = useTranslations("person.fields");
  const tg = useTranslations("person.labels.gender");
  const [deceased, setDeceased] = useState(defaults.isLiving === false);
  const birth = splitDate(defaults.birthDate ?? null, defaults.birthPrecision ?? "unknown");
  const death = splitDate(defaults.deathDate ?? null, defaults.deathPrecision ?? "unknown");
  const id = (s: string) => `${idPrefix}-${s}`;

  return (
    <div className="grid min-w-0 gap-6">
      <FormGroup>
        <FormRow label={t("fullName")} htmlFor={id("fullName")}>
          <input id={id("fullName")} name="fullName" required maxLength={160} autoComplete="off" defaultValue={defaults.fullName ?? ""} placeholder={t("required")} className={rowInput} />
        </FormRow>
        <FormRow label={t("nickname")} htmlFor={id("nickname")}>
          <input id={id("nickname")} name="nickname" maxLength={60} autoComplete="off" defaultValue={defaults.nickname ?? ""} placeholder={t("nicknamePlaceholder")} className={rowInput} />
        </FormRow>
      </FormGroup>

      <FormGroup title={t("gender")}>
        {GENDERS.map((value) => (
          <CheckRow key={value} id={id(`gender-${value}`)} name="gender" value={value} label={tg(value)} defaultChecked={(defaults.gender ?? "unknown") === value} />
        ))}
      </FormGroup>

      <FormGroup footer={t("dateFooter")}>
        <DateRow legend={t("birthDate")} prefix="birth" values={birth} idPrefix={idPrefix} />
        <FormRow label={t("birthPlace")} htmlFor={id("birthPlace")}>
          <input id={id("birthPlace")} name="birthPlace" maxLength={120} autoComplete="off" defaultValue={defaults.birthPlace ?? ""} placeholder={t("birthPlacePlaceholder")} className={rowInput} />
        </FormRow>
      </FormGroup>

      <FormGroup>
        <SwitchRow label={t("deceased")} id={id("deceased")} name="deceased" value="on" checked={deceased} onChange={(e) => setDeceased(e.target.checked)} />
        {/* Turned on just now: open the date straight away, it is the next thing to fill in. */}
        {deceased ? <DateRow legend={t("deathDate")} prefix="death" values={death} idPrefix={idPrefix} defaultOpen={defaults.isLiving !== false} /> : null}
      </FormGroup>

      <FormGroup title={t("notes")}>
        <textarea
          id={id("notes")}
          name="notes"
          aria-label={t("notes")}
          rows={3}
          maxLength={4000}
          defaultValue={defaults.notes ?? ""}
          placeholder={t("notesPlaceholder")}
          className="block min-h-24 w-full resize-y bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:bg-accent/40"
        />
      </FormGroup>
    </div>
  );
}

/** A date row: the date as text, tapped open to day, month and year rows. Any of the three may stay empty. */
export function DateRow({ legend, prefix, values, idPrefix, defaultOpen }: { legend: string; prefix: string; values: { year: string; month: string; day: string }; idPrefix: string; defaultOpen?: boolean }) {
  const t = useTranslations("person.fields");
  const tu = useTranslations("person.common");
  const te = useTranslations("errors");
  const months = monthNames(useLocale());
  const id = (s: string) => `${idPrefix}-${prefix}-${s}`;
  const [day, setDay] = useState(values.day);
  const [month, setMonth] = useState(values.month);
  const [year, setYear] = useState(values.year);
  const shown = [day.trim(), month ? months[Number(month) - 1] : "", year.trim()].filter(Boolean).join(" ");
  // The same rule as the save (checkedDate in lib/person-form.ts), said while typing rather than after.
  const gap = day.trim() && !month ? "dateNeedsMonth" : (day.trim() || month) && !year.trim() ? "dateNeedsYear" : null;
  return (
    <DisclosureRow label={legend} value={shown} placeholder={t("notSet")} defaultOpen={defaultOpen}>
      <FormRow label={t("day")} htmlFor={id("day")}>
        <input id={id("day")} name={`${prefix}Day`} inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" placeholder={t("dayPlaceholder")} value={day} onChange={(e) => setDay(e.target.value)} className={rowInput} />
      </FormRow>
      <FormRow label={t("month")} htmlFor={id("month")}>
        <RowSelect id={id("month")} name={`${prefix}Month`} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">{tu("unknown")}</option>
          {months.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </RowSelect>
      </FormRow>
      <FormRow label={t("year")} htmlFor={id("year")}>
        <input id={id("year")} name={`${prefix}Year`} inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="off" placeholder={t("yearPlaceholder")} value={year} onChange={(e) => setYear(e.target.value)} className={rowInput} />
      </FormRow>
      {gap ? (
        <p role="status" className="px-4 py-2.5 text-[13px] leading-snug text-destructive">
          {te(`person.${gap}`, { field: prefix })}
        </p>
      ) : null}
    </DisclosureRow>
  );
}
