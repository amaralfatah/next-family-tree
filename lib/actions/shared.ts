import "server-only";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { AccessError } from "@/lib/access";
import { requireUser } from "@/lib/auth/session";
import { getDb, type DB } from "@/lib/db";
import { translateError } from "@/lib/error-message";
import { UserError } from "@/lib/errors";
export { parseBirthOrders, parsePerson, parseRelation } from "@/lib/person-form";

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string; conflict?: boolean };

/** Runs a service call as the signed-in user and turns known errors into messages. */
export async function run<T>(fn: (db: DB, userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const user = await requireUser();
  try {
    const data = await fn(await getDb(), user.id);
    return { ok: true, data } as ActionResult<T>;
  } catch (e) {
    if (isUserFacing(e)) return { ok: false, error: translateError(await getTranslations("errors"), e) };
    throw e;
  }
}

/** Errors meant for the reader: UserError and AccessError carry message keys, ZodError carries the first issue's key. */
function isUserFacing(e: unknown) {
  return e instanceof UserError || e instanceof AccessError || e instanceof z.ZodError;
}

const get = (fd: FormData, k: string) => (fd.get(k) ?? "").toString();

export { get as formValue };
