"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ label, className }: { label: string; className?: string }) {
  function toggle() {
    const dark = !document.documentElement.classList.contains("dark");
    // Ease the light/dark switch with a short cross-fade instead of a sudden jump in brightness
    // (globals.css ::view-transition); skipped under reduced motion or where unsupported.
    const swap = () => document.documentElement.classList.toggle("dark", dark);
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(swap);
    else swap();
    // Keep the browser bar in step with the page, not only with the OS setting (app/layout.tsx themeColor).
    document.querySelectorAll<HTMLMetaElement>("meta[name=theme-color]").forEach((m) => (m.content = dark ? "#1f1e1d" : "#faf9f5"));
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // Storage may be unavailable (private mode); the toggle still works for this visit.
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label} className={cn("hit", className)}>
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  );
}
