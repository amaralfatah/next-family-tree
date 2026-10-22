import { cn } from "@/lib/utils";

/**
 * The Family Tree glyph: a broad canopy with a negative fork cut into it, on a soga trunk. Same
 * artwork as the app icon (sararia-logo/generate-apps.mjs, familytreeGlyph, small variant so the
 * cuts hold at text size), without the tile: the canopy follows the text colour and the trunk
 * takes --soga.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="14.5 14.5 71 71"
      aria-hidden
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      className={cn("size-7 shrink-0 text-[#1d1d1f] dark:text-white", className)}
    >
      <path d="M47.4 61.33A34.4 22.8 0 1 1 52.6 61.33L52.6 51.71L63.93 42.21A2.6 2.6 0 1 0 60.59 38.22L50 47.11L39.41 38.22A2.6 2.6 0 0 0 36.07 42.21L47.4 51.71Z" />
      <path d="M42.8 84.4L44.16 66.29A39.6 28 0 0 0 55.84 66.29L57.2 84.4Z" className="fill-soga stroke-soga" />
    </svg>
  );
}

/**
 * Family Tree lockup (sararia-logo/FAMILY.md 3.1): the glyph, then the product name in Inter SemiBold
 * with −0.045em tracking, ink on light and white on dark. Only the glyph's trunk is soga. `full`
 * adds "Sararia" for public pages, where visitors may not know the family yet.
 */
export function Wordmark({ className, full = false }: { className?: string; full?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.4em] font-[family-name:var(--font-brand-face)] text-[17px] leading-none font-semibold tracking-[-0.045em] text-[#1d1d1f] dark:text-white",
        className,
      )}
    >
      <Mark className="size-[1.15em]" />
      <span>{full ? "Sararia Family Tree" : "Family Tree"}</span>
    </span>
  );
}
