"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DropdownMenuGroup, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_NAMES, routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Switches the app's language and stays on the same page (path and query are kept). The proxy remembers the
 * choice in the NEXT_LOCALE cookie, so a later visit to a bare path lands in the same language.
 *
 * - `variant="menu"`: a radio group for inside a DropdownMenuContent (the account menu).
 * - `variant="inline"`: "Bahasa Indonesia · English" as quiet text links, for page footers.
 */
export function LanguageSwitcher({ variant = "inline", className }: { variant?: "menu" | "inline"; className?: string }) {
  // useSearchParams needs a boundary; the fallback is the same control without the query.
  return (
    <Suspense fallback={<Switcher variant={variant} search="" className={className} />}>
      <WithSearch variant={variant} className={className} />
    </Suspense>
  );
}

function WithSearch({ variant, className }: { variant: "menu" | "inline"; className?: string }) {
  const search = useSearchParams().toString();
  return <Switcher variant={variant} search={search ? `?${search}` : ""} className={className} />;
}

function Switcher({ variant, search, className }: { variant: "menu" | "inline"; search: string; className?: string }) {
  const t = useTranslations("common.language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const href = `${pathname}${search}`;

  if (variant === "menu") {
    return (
      <DropdownMenuGroup>
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={(next) => router.replace(href, { locale: next as Locale, scroll: false })}>
          {routing.locales.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} lang={l}>
              {LOCALE_NAMES[l]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>
    );
  }

  return (
    <nav aria-label={t("label")} className={cn("flex items-center gap-2 text-[13px]", className)}>
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-2">
          {i > 0 ? <span aria-hidden className="text-muted-foreground/60">·</span> : null}
          {l === locale ? (
            <span aria-current="true" lang={l} className="font-medium text-foreground">
              {LOCALE_NAMES[l]}
            </span>
          ) : (
            <Link href={href} locale={l} lang={l} hrefLang={l} scroll={false} className="inline-flex min-h-11 items-center rounded-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-60">
              {LOCALE_NAMES[l]}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
