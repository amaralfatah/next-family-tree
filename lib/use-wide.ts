"use client";

import { useSyncExternalStore } from "react";

const query = "(min-width: 1024px)";

/**
 * Wide enough for an inspector beside the chart (lg and up). Below that (phones, an iPad in portrait, a narrow
 * window) the chart needs the whole width, so the summary and the forms come up as sheets instead (HIG:
 * inspectors become sheets in compact widths).
 */
export function useWide() {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}
