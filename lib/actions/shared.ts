import "server-only";
import { z } from "zod";
import { AccessError } from "@/lib/access";
import { requireUser } from "@/lib/auth/session";
import { getDb, type DB } from "@/lib/db";
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
    if (e instanceof AccessError || e instanceof UserError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Data tidak valid." };
    throw e;
  }
}

const get = (fd: FormData, k: string) => (fd.get(k) ?? "").toString();

export { get as formValue };
