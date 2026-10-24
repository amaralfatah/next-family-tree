"use client";

import { EllipsisIcon, GlobeIcon, SunMoonIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Appearance and language live in one place on every page: the account menu once signed in, and otherwise
 * - `PreferencesInline` at the foot of text pages (landing, sign-in, privacy), as apple.com does;
 * - `PreferencesMenu`, a More button, on the full-screen chart pages (example, demo) that have no footer.
 */
// Each row keeps its 44px tap height, but rows that wrap overlap by 12px of empty space, so on a narrow
// column (sign-in) the two settings read as one group instead of two loose lines.
export function PreferencesInline({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-10 text-muted-foreground", className)}>
      <div className="-my-1.5 flex items-center gap-2">
        <GlobeIcon aria-hidden className="size-3.5 opacity-70" />
        <LanguageSwitcher variant="inline" />
      </div>
      <div className="-my-1.5 flex items-center gap-2">
        <SunMoonIcon aria-hidden className="size-3.5 opacity-70" />
        <ThemeSwitcher variant="inline" />
      </div>
    </div>
  );
}

export function PreferencesMenu() {
  const t = useTranslations("common.preferences");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t("menuAria")} title={t("menuAria")} className={buttonVariants({ variant: "ghost", size: "icon", className: "hit" })}>
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <ThemeSwitcher variant="menu" />
        <DropdownMenuSeparator />
        <LanguageSwitcher variant="menu" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
