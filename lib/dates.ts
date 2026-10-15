import type { DatePrecision } from "@/lib/types";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** "12 Maret 1950", "Maret 1950", "1950", or null for unknown. */
export function formatPartialDate(date: string | null, precision: DatePrecision): string | null {
  if (!date || precision === "unknown") return null;
  const [y, m, d] = date.split("-").map(Number);
  if (precision === "year") return String(y);
  if (precision === "month") return `${MONTHS[m - 1]} ${y}`;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function yearOf(date: string | null, precision: DatePrecision): number | null {
  if (!date || precision === "unknown") return null;
  return Number(date.slice(0, 4));
}

/** "1950–2010", "l. 1950", "w. 2010", or "" when nothing is known. */
export function lifespan(p: {
  birthDate: string | null;
  birthPrecision: DatePrecision;
  deathDate: string | null;
  deathPrecision: DatePrecision;
  isLiving: boolean;
}): string {
  const b = yearOf(p.birthDate, p.birthPrecision);
  const d = yearOf(p.deathDate, p.deathPrecision);
  if (b && d) return `${b}–${d}`;
  if (b) return p.isLiving ? `l. ${b}` : `${b}–?`;
  if (d) return `w. ${d}`;
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

export const MONTH_NAMES = MONTHS;

function pad(n: number, len: number) {
  return String(n).padStart(len, "0");
}
