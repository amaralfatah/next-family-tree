import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getPathname } from "./navigation";
import type { Locale } from "./routing";

/** Server-side redirect to an unprefixed path ("/trees", "/login?next=%2Ftrees") in the current request's locale. */
export async function redirectTo(href: string): Promise<never> {
  const locale = (await getLocale()) as Locale;
  const [path, query] = splitQuery(href);
  redirect(`${getPathname({ href: path, locale })}${query}`);
}

/** Absolute-path version for places that need a string instead of throwing (e.g. building a callback URL). */
export async function localizedPath(href: string): Promise<string> {
  const locale = (await getLocale()) as Locale;
  const [path, query] = splitQuery(href);
  return `${getPathname({ href: path, locale })}${query}`;
}

function splitQuery(href: string): [string, string] {
  const i = href.search(/[?#]/);
  return i === -1 ? [href, ""] : [href.slice(0, i), href.slice(i)];
}
