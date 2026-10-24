"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { DropdownMenuGroup, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** "system" follows the OS (nothing stored); "light"/"dark" are saved in localStorage "theme", read by theme-script.tsx. */
export type Theme = "system" | "light" | "dark";
const THEMES: Theme[] = ["system", "light", "dark"];

// The inline switcher marks its current choice from <html data-theme-pref>, which theme-script.tsx sets before
// first paint; React state would show Automatic until hydration and then jump. Written out so Tailwind sees them.
const CURRENT: Record<Theme, string> = {
  system: "in-data-[theme-pref=system]:font-medium in-data-[theme-pref=system]:text-foreground",
  light: "in-data-[theme-pref=light]:font-medium in-data-[theme-pref=light]:text-foreground",
  dark: "in-data-[theme-pref=dark]:font-medium in-data-[theme-pref=dark]:text-foreground",
};

const listeners = new Set<() => void>();

export function readTheme(): Theme {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/**
 * Puts the page in the given theme now: the .dark class, the browser bar colour (app/layout.tsx themeColor), and
 * data-theme-pref on <html>, which the inline switcher styles its current choice from (also set by theme-script.tsx).
 */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.themePref = theme;
  const dark = theme === "system" ? matchMedia("(prefers-color-scheme: dark)").matches : theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.querySelectorAll<HTMLMetaElement>("meta[name=theme-color]").forEach((m) => (m.content = dark ? "#1f1e1d" : "#faf9f5"));
}

function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", theme);
  } catch {
    // Storage may be unavailable (private mode); the choice still applies for this visit.
  }
  // Ease the light/dark switch with a short cross-fade instead of a sudden jump in brightness
  // (globals.css ::view-transition); skipped under reduced motion or where unsupported.
  const swap = () => applyTheme(theme);
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(swap);
  else swap();
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab changed it.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "system");
}

/**
 * Automatic / Light / Dark, as in iOS Settings › Display & Brightness. Automatic is the default and follows the OS.
 *
 * - `variant="menu"`: a radio group for inside a DropdownMenuContent (the account menu, PreferencesMenu).
 * - `variant="inline"`: quiet text buttons for page footers, next to LanguageSwitcher.
 */
export function ThemeSwitcher({ variant = "inline", className }: { variant?: "menu" | "inline"; className?: string }) {
  const t = useTranslations("common.theme");
  const theme = useTheme();

  if (variant === "menu") {
    return (
      <DropdownMenuGroup>
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(next) => setTheme(next as Theme)}>
          {THEMES.map((v) => (
            <DropdownMenuRadioItem key={v} value={v}>
              {t(v)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>
    );
  }

  return (
    <div role="group" aria-label={t("label")} className={cn("flex items-center gap-2 text-[13px]", className)}>
      {THEMES.map((v, i) => (
        <span key={v} className="flex items-center gap-2">
          {i > 0 ? <span aria-hidden className="text-muted-foreground/60">·</span> : null}
          <button
            type="button"
            aria-pressed={v === theme}
            onClick={() => setTheme(v)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-60",
              CURRENT[v],
            )}
          >
            {t(v)}
          </button>
        </span>
      ))}
    </div>
  );
}
