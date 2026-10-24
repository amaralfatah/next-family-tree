import { z } from "zod";
import { UserError } from "@/lib/errors";


/** The part of next-intl's translator that matters here; works with both useTranslations("errors") and getTranslations("errors"). */
type ErrorTranslator = ((key: string, values?: Record<string, string | number>) => string) & { has: (key: string) => boolean };

/**
 * Turns a thrown UserError or ZodError into text for the reader. Their messages are keys in the `errors`
 * namespace (messages/<locale>/errors.json); a message that is not a known key is returned as is.
 */
export function translateError(t: ErrorTranslator, error: unknown, fallbackKey = "unknown"): string {
  if (error instanceof UserError) return translateKey(t, error.message, error.values);
  // AccessError (lib/access) is matched by name so this file stays free of server-only imports; its message is a key too.
  if (error instanceof Error && error.name === "AccessError") return translateKey(t, error.message);
  if (error instanceof z.ZodError) return translateKey(t, error.issues[0]?.message ?? fallbackKey);
  return t(fallbackKey);
}

export function translateKey(t: ErrorTranslator, key: string, values?: Record<string, string | number>): string {
  return t.has(key) ? t(key, values) : key;
}
