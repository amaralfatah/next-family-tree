"use client";

import { useLayoutEffect } from "react";
import { useLocale } from "next-intl";
import { applyTheme, readTheme } from "@/components/theme-switcher";

/**
 * Keeps the page in the chosen theme after the first paint (theme-script.tsx handles that one):
 * - Switching language renders a new root layout, and React then rewrites <html class> back to the font classes,
 *   dropping "dark". Re-apply in a layout effect so it lands before the next paint.
 * - On Automatic, follow the OS when it changes (e.g. at sunset); and follow a choice made in another tab.
 */
export function ThemeSync() {
  const locale = useLocale();
  useLayoutEffect(() => {
    applyTheme(readTheme());
  }, [locale]);
  useLayoutEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => readTheme() === "system" && applyTheme("system");
    const onStorage = (e: StorageEvent) => e.key === "theme" && applyTheme(readTheme());
    media.addEventListener("change", onSystem);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystem);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}
