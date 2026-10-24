import "server-only";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

/** API routes sit outside /[locale], so the reader's language comes from the NEXT_LOCALE cookie, then Accept-Language. */
export function requestLocale(req: NextRequest) {
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  if (hasLocale(routing.locales, cookie)) return cookie;
  for (const part of (req.headers.get("accept-language") ?? "").split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase().split("-")[0];
    if (hasLocale(routing.locales, tag)) return tag;
  }
  return routing.defaultLocale;
}

/** The `errors` translator for an API route's response text. */
export async function apiErrors(req: NextRequest) {
  return getTranslations({ locale: requestLocale(req), namespace: "errors" });
}
