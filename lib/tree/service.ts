import { and, asc, count, desc, eq, inArray, lt, or } from "drizzle-orm";
import { requireRole, type TreeAccess } from "@/lib/access";
import type { DB } from "@/lib/db";
import { changeLog, persons, treeMembers, trees, unionChildren, unions, users } from "@/lib/db/schema";
import { UserError } from "@/lib/errors";
import type { ChildRelation, DatePrecision, Gender, Person, Role, TreeData, Union, UnionStatus } from "@/lib/types";
import { invalidPartners, wouldCreateCycle } from "./validate";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Conn = DB | Tx;

export interface PersonInput {
  fullName: string;
  nickname: string | null;
  gender: Gender;
  birthDate: string | null;
  birthPrecision: DatePrecision;
  birthPlace: string | null;
  isLiving: boolean;
  deathDate: string | null;
  deathPrecision: DatePrecision;
  notes: string | null;
  photoKey?: string | null;
}

export type RelationKind = "parent" | "partner" | "child" | "sibling";

export interface RelationSpec {
  kind: RelationKind;
  /** The existing person the new relation hangs off. */
  ofId: string;
  /** For "child": which union of `ofId` the child belongs to; null = a union with only `ofId`. */
  unionId?: string | null;
  childRelation?: ChildRelation;
  unionStatus?: UnionStatus;
}

// ---------------------------------------------------------------- mapping

type PersonRow = typeof persons.$inferSelect;
type UnionRow = typeof unions.$inferSelect;

export function toPerson(r: PersonRow): Person {
  return {
    id: r.id,
    fullName: r.fullName,
    nickname: r.nickname,
    gender: r.gender,
    birthDate: r.birthDate,
    birthPrecision: r.birthPrecision,
    birthPlace: r.birthPlace,
    isLiving: r.isLiving,
    deathDate: r.deathDate,
    deathPrecision: r.deathPrecision,
    photoKey: r.photoKey,
    notes: r.notes,
    updatedAt: r.updatedAt.toISOString(),
  };
}

function toUnion(r: UnionRow): Union {
  return {
    id: r.id,
    partnerAId: r.partnerAId,
    partnerBId: r.partnerBId,
    status: r.status,
    startDate: r.startDate,
    orderIndex: r.orderIndex,
  };
}

async function log(
  conn: Conn,
  entry: { treeId: string; userId: string; entity: string; entityId?: string | null; action: string; summary: string; diff?: unknown },
) {
  await conn.insert(changeLog).values({ ...entry, entityId: entry.entityId ?? null, diff: entry.diff ?? null });
}

// ---------------------------------------------------------------- trees

export async function createTree(
  db: DB,
  userId: string,
  input: { name: string; description: string | null; firstPerson: PersonInput; isMe: boolean },
): Promise<string> {
  return db.transaction(async (tx) => {
    const [tree] = await tx
      .insert(trees)
      .values({ ownerId: userId, name: input.name, description: input.description })
      .returning({ id: trees.id });
    const [person] = await tx
      .insert(persons)
      .values({ ...input.firstPerson, treeId: tree.id })
      .returning({ id: persons.id });
    await tx.update(trees).set({ rootPersonId: person.id }).where(eq(trees.id, tree.id));
    await tx.insert(treeMembers).values({
      treeId: tree.id,
      userId,
      role: "owner",
      personId: input.isMe ? person.id : null,
    });
    await log(tx, { treeId: tree.id, userId, entity: "tree", entityId: tree.id, action: "create", summary: `Membuat pohon "${input.name}"` });
    return tree.id;
  });
}

export async function listTreesForUser(db: DB, userId: string) {
  const rows = await db
    .select({ id: trees.id, name: trees.name, description: trees.description, role: treeMembers.role, createdAt: trees.createdAt })
    .from(treeMembers)
    .innerJoin(trees, eq(trees.id, treeMembers.treeId))
    .where(eq(treeMembers.userId, userId))
    .orderBy(desc(trees.createdAt));
  if (rows.length === 0) return [];
  const counts = await db
    .select({ treeId: persons.treeId, n: count() })
    .from(persons)
    .where(inArray(persons.treeId, rows.map((r) => r.id)))
    .groupBy(persons.treeId);
  const byTree = new Map(counts.map((c) => [c.treeId, Number(c.n)]));
  return rows.map((r) => ({ ...r, personCount: byTree.get(r.id) ?? 0 }));
}

export async function getTree(db: DB, userId: string, treeId: string) {
  // The tree row is only returned once the membership check passes, so both can be in flight together.
  const [access, [tree]] = await Promise.all([requireRole(db, treeId, userId, "viewer"), db.select().from(trees).where(eq(trees.id, treeId))]);
  return { tree, access, ...access };
}

export async function updateTree(db: DB, userId: string, treeId: string, input: { name: string; description: string | null }) {
  await requireRole(db, treeId, userId, "editor");
  await db.update(trees).set(input).where(eq(trees.id, treeId));
  await log(db, { treeId, userId, entity: "tree", entityId: treeId, action: "update", summary: `Mengubah info pohon menjadi "${input.name}"` });
}

export async function setRootPerson(db: DB, userId: string, treeId: string, personId: string) {
  await requireRole(db, treeId, userId, "editor");
  await requirePerson(db, treeId, personId);
  await db.update(trees).set({ rootPersonId: personId }).where(eq(trees.id, treeId));
}

/** Returns photo keys so the caller can delete them from storage after the rows are gone. */
export async function deleteTree(db: DB, userId: string, treeId: string): Promise<string[]> {
  await requireRole(db, treeId, userId, "owner");
  const photos = await db.select({ key: persons.photoKey }).from(persons).where(eq(persons.treeId, treeId));
  await db.delete(trees).where(eq(trees.id, treeId));
  return photos.map((p) => p.key).filter((k): k is string => Boolean(k));
}

export async function loadTreeData(db: DB, userId: string, treeId: string): Promise<TreeData> {
  return loadTreeDataWith(db, await requireRole(db, treeId, userId, "viewer"));
}

export function loadTreeDataWith(db: DB, access: TreeAccess): Promise<TreeData> {
  return readTreeData(db, access.treeId);
}

async function readTreeData(conn: Conn, treeId: string): Promise<TreeData> {
  // One round-trip: the child links are filtered by a subquery instead of waiting for the union ids.
  const [personRows, unionRows, childRows] = await Promise.all([
    conn.select().from(persons).where(eq(persons.treeId, treeId)).orderBy(asc(persons.createdAt)),
    conn.select().from(unions).where(eq(unions.treeId, treeId)).orderBy(asc(unions.orderIndex)),
    conn
      .select()
      .from(unionChildren)
      .where(inArray(unionChildren.unionId, conn.select({ id: unions.id }).from(unions).where(eq(unions.treeId, treeId)))),
  ]);
  return {
    persons: personRows.map(toPerson),
    unions: unionRows.map(toUnion),
    children: childRows.map((c) => ({ unionId: c.unionId, childId: c.childId, relation: c.relation, birthOrder: c.birthOrder })),
  };
}

/** Person and union counts, for pages that show totals without the whole tree. */
export async function countTreeContents(conn: Conn, treeId: string) {
  const [[p], [u]] = await Promise.all([
    conn.select({ n: count() }).from(persons).where(eq(persons.treeId, treeId)),
    conn.select({ n: count() }).from(unions).where(eq(unions.treeId, treeId)),
  ]);
  return { persons: p.n, unions: u.n };
}

// ---------------------------------------------------------------- persons

async function requirePerson(conn: Conn, treeId: string, personId: string): Promise<PersonRow> {
  const [row] = await conn
    .select()
    .from(persons)
    .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)));
  if (!row) throw new UserError("Orang tidak ditemukan di pohon ini.");
  return row;
}

async function requireUnion(conn: Conn, treeId: string, unionId: string): Promise<UnionRow> {
  const [row] = await conn
    .select()
    .from(unions)
    .where(and(eq(unions.id, unionId), eq(unions.treeId, treeId)));
  if (!row) throw new UserError("Ikatan tidak ditemukan di pohon ini.");
  return row;
}

export async function getPerson(db: DB, userId: string, treeId: string, personId: string) {
  return getPersonWith(db, await requireRole(db, treeId, userId, "viewer"), personId);
}

export async function getPersonWith(db: DB, access: TreeAccess, personId: string) {
  return toPerson(await requirePerson(db, access.treeId, personId));
}

/** Creates a person, optionally related to someone already in the tree. */
export async function createPerson(
  db: DB,
  userId: string,
  treeId: string,
  input: PersonInput,
  relation?: RelationSpec,
): Promise<string> {
  await requireRole(db, treeId, userId, "editor");
  return db.transaction(async (tx) => {
    if (relation) await requirePerson(tx, treeId, relation.ofId);
    const [row] = await tx
      .insert(persons)
      .values({ ...input, treeId })
      .returning({ id: persons.id });
    if (relation) await relate(tx, userId, treeId, relation, row.id);
    await log(tx, {
      treeId,
      userId,
      entity: "person",
      entityId: row.id,
      action: "create",
      summary: `Menambahkan ${input.fullName}`,
      diff: { after: input },
    });
    return row.id;
  });
}

/** Links an existing person `otherId` to `relation.ofId`. */
export async function linkExisting(db: DB, userId: string, treeId: string, relation: RelationSpec, otherId: string) {
  await requireRole(db, treeId, userId, "editor");
  await db.transaction(async (tx) => {
    const of = await requirePerson(tx, treeId, relation.ofId);
    const other = await requirePerson(tx, treeId, otherId);
    await relate(tx, userId, treeId, relation, otherId);
    await log(tx, {
      treeId,
      userId,
      entity: "relation",
      entityId: otherId,
      action: "link",
      summary: `Menautkan ${other.fullName} sebagai ${KIND_LABEL[relation.kind]} ${of.fullName}`,
    });
  });
}

const KIND_LABEL: Record<RelationKind, string> = {
  parent: "orang tua",
  partner: "pasangan",
  child: "anak",
  sibling: "saudara",
};

async function relate(tx: Tx, userId: string, treeId: string, rel: RelationSpec, otherId: string) {
  const data = await readTreeData(tx, treeId);
  const childRelation = rel.childRelation ?? "biological";

  if (rel.kind === "partner") {
    const problem = invalidPartners(data, rel.ofId, otherId);
    if (problem) throw new UserError(problem);
    const exists = data.unions.some(
      (u) =>
        (u.partnerAId === rel.ofId && u.partnerBId === otherId) || (u.partnerAId === otherId && u.partnerBId === rel.ofId),
    );
    if (exists) throw new UserError("Keduanya sudah tercatat sebagai pasangan.");
    // A single-parent union of `ofId` (children with an unknown partner) gets this partner.
    const solo = data.unions.find((u) => u.partnerAId === rel.ofId && u.partnerBId === null);
    if (solo) {
      await tx.update(unions).set({ partnerBId: otherId, status: rel.unionStatus ?? "married" }).where(eq(unions.id, solo.id));
      return;
    }
    const order = data.unions.filter((u) => u.partnerAId === rel.ofId || u.partnerBId === rel.ofId).length;
    await tx.insert(unions).values({
      treeId,
      partnerAId: rel.ofId,
      partnerBId: otherId,
      status: rel.unionStatus ?? "married",
      orderIndex: order,
    });
    return;
  }

  if (rel.kind === "child") {
    let unionId = rel.unionId ?? null;
    if (unionId) {
      const u = await requireUnion(tx, treeId, unionId);
      if (u.partnerAId !== rel.ofId && u.partnerBId !== rel.ofId) throw new UserError("Ikatan tidak cocok dengan orang tua.");
    } else {
      const solo = data.unions.find((u) => u.partnerAId === rel.ofId && u.partnerBId === null);
      unionId = solo?.id ?? (await insertSoloUnion(tx, treeId, rel.ofId, data));
    }
    await addChild(tx, data, unionId, otherId, childRelation);
    return;
  }

  if (rel.kind === "parent") {
    const links = data.children.filter((c) => c.childId === rel.ofId && c.relation === childRelation);
    // Fill the empty slot of an existing single-parent union before creating a new one.
    for (const link of links) {
      const u = data.unions.find((x) => x.id === link.unionId)!;
      if (u.partnerBId === null) {
        const problem = invalidPartners(data, u.partnerAId, otherId);
        if (problem) throw new UserError(problem);
        if (wouldCreateCycle(data, [otherId], rel.ofId)) throw new UserError(CYCLE);
        await tx.update(unions).set({ partnerBId: otherId }).where(eq(unions.id, u.id));
        return;
      }
    }
    if (links.length > 0 && childRelation === "biological") {
      throw new UserError("Orang ini sudah punya dua orang tua kandung. Ubah ikatan yang ada bila perlu.");
    }
    const unionId = await insertSoloUnion(tx, treeId, otherId, data);
    await addChild(tx, data, unionId, rel.ofId, childRelation);
    return;
  }

  // sibling: share the biological parents' union of `ofId`.
  const link = data.children.find((c) => c.childId === rel.ofId && c.relation === "biological");
  if (!link) throw new UserError("Tambahkan orang tua terlebih dahulu agar saudara bisa dihubungkan.");
  await addChild(tx, data, link.unionId, otherId, childRelation);
}

const CYCLE = "Relasi ini membuat seseorang menjadi leluhur dirinya sendiri.";

async function insertSoloUnion(tx: Tx, treeId: string, partnerId: string, data: TreeData) {
  const order = data.unions.filter((u) => u.partnerAId === partnerId || u.partnerBId === partnerId).length;
  const [u] = await tx
    .insert(unions)
    .values({ treeId, partnerAId: partnerId, partnerBId: null, status: "unknown", orderIndex: order })
    .returning({ id: unions.id });
  data.unions.push({ id: u.id, partnerAId: partnerId, partnerBId: null, status: "unknown", startDate: null, orderIndex: order });
  return u.id;
}

async function addChild(tx: Tx, data: TreeData, unionId: string, childId: string, relation: ChildRelation) {
  const u = data.unions.find((x) => x.id === unionId);
  if (!u) throw new UserError("Ikatan tidak ditemukan.");
  const parents = [u.partnerAId, u.partnerBId].filter(Boolean) as string[];
  if (wouldCreateCycle(data, parents, childId)) throw new UserError(CYCLE);
  if (data.children.some((c) => c.unionId === unionId && c.childId === childId)) {
    throw new UserError("Anak ini sudah tercatat di ikatan tersebut.");
  }
  const order = data.children.filter((c) => c.unionId === unionId).length + 1;
  await tx.insert(unionChildren).values({ unionId, childId, relation, birthOrder: order });
}

/**
 * Last write wins, but if the row changed since the editor opened it (`expectedUpdatedAt`)
 * and `force` is false, nothing is written and the caller can warn the user.
 */
export async function updatePerson(
  db: DB,
  userId: string,
  treeId: string,
  personId: string,
  input: PersonInput,
  opts: { expectedUpdatedAt?: string; force?: boolean } = {},
): Promise<{ conflict: boolean }> {
  await requireRole(db, treeId, userId, "editor");
  return db.transaction(async (tx) => {
    const before = await requirePerson(tx, treeId, personId);
    if (opts.expectedUpdatedAt && !opts.force && before.updatedAt.toISOString() !== opts.expectedUpdatedAt) {
      return { conflict: true };
    }
    await tx
      .update(persons)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)));
    const beforeObj = toPerson(before) as unknown as Record<string, unknown>;
    const changed = Object.fromEntries(
      Object.entries(input)
        .filter(([k, v]) => v !== undefined && beforeObj[k] !== v)
        .map(([k, v]) => [k, { from: beforeObj[k], to: v }]),
    );
    if (Object.keys(changed).length) {
      await log(tx, {
        treeId,
        userId,
        entity: "person",
        entityId: personId,
        action: "update",
        summary: `Mengubah data ${input.fullName}`,
        diff: changed,
      });
    }
    return { conflict: false };
  });
}

export async function setPhoto(db: DB, userId: string, treeId: string, personId: string, photoKey: string | null) {
  await requireRole(db, treeId, userId, "editor");
  const before = await requirePerson(db, treeId, personId);
  await db.update(persons).set({ photoKey, updatedAt: new Date() }).where(eq(persons.id, personId));
  await log(db, {
    treeId,
    userId,
    entity: "person",
    entityId: personId,
    action: "update",
    summary: photoKey ? `Mengganti foto ${before.fullName}` : `Menghapus foto ${before.fullName}`,
  });
  return before.photoKey;
}

/**
 * Deleting a person keeps their children and the other parent connected: a union loses
 * only this partner, and disappears only when nobody is left in it.
 */
export async function deletePerson(db: DB, userId: string, treeId: string, personId: string): Promise<string | null> {
  await requireRole(db, treeId, userId, "editor");
  return db.transaction(async (tx) => {
    const person = await requirePerson(tx, treeId, personId);
    const own = await tx
      .select()
      .from(unions)
      .where(and(eq(unions.treeId, treeId), or(eq(unions.partnerAId, personId), eq(unions.partnerBId, personId))));
    for (const u of own) {
      const other = u.partnerAId === personId ? u.partnerBId : u.partnerAId;
      if (other) await tx.update(unions).set({ partnerAId: other, partnerBId: null }).where(eq(unions.id, u.id));
      else await tx.delete(unions).where(eq(unions.id, u.id));
    }
    await tx.delete(persons).where(eq(persons.id, personId));
    const [tree] = await tx.select({ root: trees.rootPersonId }).from(trees).where(eq(trees.id, treeId));
    if (tree?.root === personId) {
      const [next] = await tx.select({ id: persons.id }).from(persons).where(eq(persons.treeId, treeId)).limit(1);
      await tx.update(trees).set({ rootPersonId: next?.id ?? null }).where(eq(trees.id, treeId));
    }
    await log(tx, {
      treeId,
      userId,
      entity: "person",
      entityId: personId,
      action: "delete",
      summary: `Menghapus ${person.fullName}`,
      diff: { before: toPerson(person) },
    });
    return person.photoKey;
  });
}

// ---------------------------------------------------------------- unions

export async function updateUnion(
  db: DB,
  userId: string,
  treeId: string,
  unionId: string,
  input: { status: UnionStatus; startDate: string | null; orderIndex: number },
) {
  await requireRole(db, treeId, userId, "editor");
  await requireUnion(db, treeId, unionId);
  await db.update(unions).set(input).where(eq(unions.id, unionId));
  await log(db, { treeId, userId, entity: "union", entityId: unionId, action: "update", summary: "Mengubah data ikatan", diff: input });
}

export async function deleteUnion(db: DB, userId: string, treeId: string, unionId: string) {
  await requireRole(db, treeId, userId, "editor");
  await requireUnion(db, treeId, unionId);
  await db.delete(unions).where(eq(unions.id, unionId));
  await log(db, { treeId, userId, entity: "union", entityId: unionId, action: "delete", summary: "Menghapus ikatan" });
}

export async function updateChildLink(
  db: DB,
  userId: string,
  treeId: string,
  unionId: string,
  childId: string,
  input: { relation: ChildRelation; birthOrder: number | null },
) {
  await requireRole(db, treeId, userId, "editor");
  await requireUnion(db, treeId, unionId);
  await db
    .update(unionChildren)
    .set(input)
    .where(and(eq(unionChildren.unionId, unionId), eq(unionChildren.childId, childId)));
  await log(db, { treeId, userId, entity: "relation", entityId: childId, action: "update", summary: "Mengubah hubungan anak", diff: input });
}

export async function removeChildLink(db: DB, userId: string, treeId: string, unionId: string, childId: string) {
  await requireRole(db, treeId, userId, "editor");
  await requireUnion(db, treeId, unionId);
  const child = await requirePerson(db, treeId, childId);
  await db.delete(unionChildren).where(and(eq(unionChildren.unionId, unionId), eq(unionChildren.childId, childId)));
  await log(db, { treeId, userId, entity: "relation", entityId: childId, action: "unlink", summary: `Melepas tautan orang tua ${child.fullName}` });
}

// ---------------------------------------------------------------- history & export

export async function listChanges(db: DB, userId: string, treeId: string, opts: { before?: Date; limit?: number } = {}) {
  return listChangesWith(db, await requireRole(db, treeId, userId, "viewer"), opts);
}

export async function listChangesWith(db: DB, access: TreeAccess, opts: { before?: Date; limit?: number } = {}) {
  const { treeId } = access;
  const limit = opts.limit ?? 50;
  const rows = await db
    .select({
      id: changeLog.id,
      entity: changeLog.entity,
      entityId: changeLog.entityId,
      action: changeLog.action,
      summary: changeLog.summary,
      diff: changeLog.diff,
      createdAt: changeLog.createdAt,
      userName: users.name,
    })
    .from(changeLog)
    .leftJoin(users, eq(users.id, changeLog.userId))
    .where(and(eq(changeLog.treeId, treeId), opts.before ? lt(changeLog.createdAt, opts.before) : undefined))
    .orderBy(desc(changeLog.createdAt))
    .limit(limit + 1);
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
}

export async function exportTree(db: DB, userId: string, treeId: string) {
  const { tree } = await getTree(db, userId, treeId);
  const data = await readTreeData(db, treeId);
  return {
    format: "wargi-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    tree: { id: tree.id, name: tree.name, description: tree.description, rootPersonId: tree.rootPersonId },
    ...data,
  };
}

export type { Role };
