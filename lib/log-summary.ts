/**
 * Change-log summaries are stored as a message key plus values, so the history page can show them in the
 * reader's language. Rows written before this was introduced hold plain Indonesian text and are shown as is.
 */
export function encodeSummary(key: string, values?: Record<string, string | number>): string {
  return JSON.stringify(values ? { k: key, v: values } : { k: key });
}

export function decodeSummary(summary: string): { key: string; values?: Record<string, string | number> } | null {
  if (!summary.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(summary) as { k?: unknown; v?: Record<string, string | number> };
    return typeof parsed.k === "string" ? { key: parsed.k, values: parsed.v } : null;
  } catch {
    return null;
  }
}
