import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["id", "en"],
  defaultLocale: "id",
  // Every page lives under /id or /en. A bare path is redirected by the proxy using the NEXT_LOCALE cookie, then Accept-Language.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
export const LOCALE_NAMES: Record<Locale, string> = { id: "Bahasa Indonesia", en: "English" };
