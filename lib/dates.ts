import type { DatePrecision } from "@/lib/types";

/** Anything with a locale code of the app ("id" or "en"); other values fall back to Indonesian. */
type Loc = string;

const LIFESPAN_WORDS: Record<string, { born: string; died: string }> = {
  id: { born: "l.", died: "w." },
  en: { born: "b.", died: "d." },
};

function utc(y: number, m: number, d: number) {
  const date = new Date(0);
  date.setUTCFullYear(y, m - 1, d);
  return date;
}

/** Month names for a locale, January first ("Januari" … in id, "January" … in en). */
export function monthNames(locale: Loc = "id"): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, i) => fmt.format(utc(2000, i + 1, 1)));
}

/** "12 Maret 1950" / "March 12, 1950", "Maret 1950" / "March 1950", "1950", or null for unknown. */
export function formatPartialDate(date: string | null, precision: DatePrecision, locale: Loc = "id"): string | null {
  if (!date || precision === "unknown") return null;
  const [y, m, d] = date.split("-").map(Number);
  if (precision === "year") return String(y);
  const opts: Intl.DateTimeFormatOptions = precision === "month" ? { month: "long", year: "numeric" } : { day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(utc(y, m, d));
}

export function yearOf(date: string | null, precision: DatePrecision): number | null {
  if (!date || precision === "unknown") return null;
  return Number(date.slice(0, 4));
}

/** "1950–2010", "l. 1950", "w. 2010" (en: "b." / "d."), or "" when nothing is known. */
export function lifespan(
  p: {
    birthDate: string | null;
    birthPrecision: DatePrecision;
    deathDate: string | null;
    deathPrecision: DatePrecision;
    isLiving: boolean;
  },
  locale: Loc = "id",
): string {
  const w = LIFESPAN_WORDS[locale] ?? LIFESPAN_WORDS.id;
  const b = yearOf(p.birthDate, p.birthPrecision);
  const d = yearOf(p.deathDate, p.deathPrecision);
  if (b && d) return `${b}–${d}`;
  if (b) return p.isLiving ? `${w.born} ${b}` : `${b}–?`;
  if (d) return `${w.died} ${d}`;
  return "";
}

/**
 * Builds a storable ISO date from form parts. Missing month/day are filled with 1 so the
 * value sorts sensibly; the precision records what was actually known.
 */
export function composeDate(
  year: string | undefined,
  month: string | undefined,
  day: string | undefined,
): { date: string | null; precision: DatePrecision } {
  const y = Number(year);
  if (!year || !Number.isInteger(y) || y < 1 || y > 9999) return { date: null, precision: "unknown" };
  const m = Number(month);
  if (!month || !Number.isInteger(m) || m < 1 || m > 12) return { date: `${pad(y, 4)}-01-01`, precision: "year" };
  const d = Number(day);
  const maxDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (!day || !Number.isInteger(d) || d < 1 || d > maxDay) {
    return { date: `${pad(y, 4)}-${pad(m, 2)}-01`, precision: "month" };
  }
  return { date: `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`, precision: "day" };
}

/** Inverse of composeDate for prefilling forms. */
export function splitDate(date: string | null, precision: DatePrecision) {
  if (!date || precision === "unknown") return { year: "", month: "", day: "" };
  const [y, m, d] = date.split("-");
  return {
    year: String(Number(y)),
    month: precision === "year" ? "" : String(Number(m)),
    day: precision === "day" ? String(Number(d)) : "",
  };
}

/** Indonesian month names; use monthNames(locale) for anything shown in the reader's language. */
export const MONTH_NAMES = monthNames("id");

function pad(n: number, len: number) {
  return String(n).padStart(len, "0");
}
