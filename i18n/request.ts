import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/** One JSON file per area under messages/<locale>/, exposed as a namespace of the same name: useTranslations("trees"). */
const NAMESPACES = ["common", "public", "trees", "person", "chart", "kinship", "errors"] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const entries = await Promise.all(NAMESPACES.map(async (ns) => [ns, (await import(`../messages/${locale}/${ns}.json`)).default] as const));
  return { locale, messages: Object.fromEntries(entries) };
});
