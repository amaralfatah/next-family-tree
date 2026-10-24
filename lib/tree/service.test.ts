import { beforeAll, describe, expect, it } from "vitest";
import { AccessError, requireRole } from "@/lib/access";
import type { DB } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { acceptInvite, createInvite, leaveTree, listInvitesWith, listMembersWith, revokeInvite, transferOwnership } from "@/lib/members/service";
import { createTestDb, createUser } from "@/lib/test-db";
import {
  createPerson,
  createTree,
  deletePerson,
  linkExisting,
  loadTreeData,
  updatePerson,
  type PersonInput,
} from "./service";

const person = (fullName: string, gender: PersonInput["gender"] = "unknown"): PersonInput => ({
  fullName,
  nickname: null,
  gender,
  birthDate: null,
  birthPrecision: "unknown",
  birthPlace: null,
  isLiving: true,
  deathDate: null,
  deathPrecision: "unknown",
  notes: null,
});

let db: DB;
let owner: string;
let editor: string;
let viewer: string;
let stranger: string;
let treeId: string;
let rootId: string;

beforeAll(async () => {
  db = await createTestDb();
  owner = await createUser(db, "Pemilik");
  editor = await createUser(db, "Editor");
  viewer = await createUser(db, "Pembaca");
  stranger = await createUser(db, "Asing");
  treeId = await createTree(db, owner, {
    name: "Bani Abdullah",
    description: null,
    firstPerson: person("H. Abdullah", "male"),
    isMe: false,
  });
  rootId = (await loadTreeData(db, owner, treeId)).persons[0].id;
  const e = await createInvite(db, owner, treeId, "editor", 7);
  await acceptInvite(db, editor, e.token);
  const v = await createInvite(db, owner, treeId, "viewer", 7);
  await acceptInvite(db, viewer, v.token);
});

describe("authorization", () => {
  it("non-members cannot read", async () => {
    await expect(loadTreeData(db, stranger, treeId)).rejects.toBeInstanceOf(AccessError);
  });

  it("a checked access reads without a second membership query, but keeps its role", async () => {
    const asViewer = await requireRole(db, treeId, viewer, "viewer");
    expect(asViewer).toMatchObject({ treeId, role: "viewer" });
    await expect(listMembersWith(db, asViewer)).resolves.toHaveLength(3);
    await expect(listInvitesWith(db, asViewer)).rejects.toMatchObject({ code: "forbidden" });
    await expect(listInvitesWith(db, await requireRole(db, treeId, owner, "owner"))).resolves.toHaveLength(2);
  });

  it("viewers can read but not write", async () => {
    await expect(loadTreeData(db, viewer, treeId)).resolves.toBeTruthy();
    await expect(createPerson(db, viewer, treeId, person("X"))).rejects.toMatchObject({ code: "forbidden" });
  });

  it("editors can write but not manage members", async () => {
    await expect(createPerson(db, editor, treeId, person("Y"))).resolves.toBeTypeOf("string");
    await expect(createInvite(db, editor, treeId, "editor", 7)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects revoked and expired invites", async () => {
    const inv = await createInvite(db, owner, treeId, "viewer", 7);
    await revokeInvite(db, owner, treeId, inv.id);
    await expect(acceptInvite(db, stranger, inv.token)).rejects.toBeInstanceOf(UserError);
    await expect(acceptInvite(db, stranger, "bukan-token")).rejects.toBeInstanceOf(UserError);
    await expect(loadTreeData(db, stranger, treeId)).rejects.toBeInstanceOf(AccessError);
  });

  it("garbage tree ids look like missing trees", async () => {
    await expect(loadTreeData(db, owner, "nope")).rejects.toMatchObject({ code: "not_found" });
  });

  it("owner must transfer before leaving", async () => {
    const t = await createTree(db, owner, { name: "T2", description: null, firstPerson: person("A"), isMe: false });
    const inv = await createInvite(db, owner, t, "editor", 1);
    await acceptInvite(db, editor, inv.token);
    await expect(leaveTree(db, owner, t)).rejects.toBeInstanceOf(UserError);
    await transferOwnership(db, owner, t, editor);
    await expect(leaveTree(db, owner, t)).resolves.toBeUndefined();
    await expect(loadTreeData(db, owner, t)).rejects.toBeInstanceOf(AccessError);
  });
});

describe("relations", () => {
  it("adds a spouse and children under the union, then a sibling", async () => {
    const wife = await createPerson(db, editor, treeId, person("Hj. Aminah", "female"), { kind: "partner", ofId: rootId });
    const data = await loadTreeData(db, editor, treeId);
    const union = data.unions.find((u) => u.partnerAId === rootId && u.partnerBId === wife)!;
    expect(union).toBeTruthy();
    const child = await createPerson(db, editor, treeId, person("Ahmad", "male"), { kind: "child", ofId: rootId, unionId: union.id });
    const sib = await createPerson(db, editor, treeId, person("Fatimah", "female"), { kind: "sibling", ofId: child });
    const after = await loadTreeData(db, editor, treeId);
    expect(after.children.filter((c) => c.unionId === union.id).map((c) => c.childId)).toEqual([child, sib]);
  });

  it("puts a new sibling at the chosen place, or after the last one", async () => {
    const parent = await createPerson(db, editor, treeId, person("Khadijah", "female"), { kind: "partner", ofId: rootId });
    const union = (await loadTreeData(db, editor, treeId)).unions.find((u) => u.partnerBId === parent)!;
    const first = await createPerson(db, editor, treeId, person("Zaid"), { kind: "child", ofId: parent, unionId: union.id });
    const eldest = await createPerson(db, editor, treeId, person("Hasan"), { kind: "sibling", ofId: first, birthOrder: 1 });
    const last = await createPerson(db, editor, treeId, person("Husain"), { kind: "sibling", ofId: first });
    const order = (await loadTreeData(db, editor, treeId)).children.filter((c) => c.unionId === union.id);
    expect(Object.fromEntries(order.map((c) => [c.childId, c.birthOrder]))).toEqual({ [eldest]: 1, [first]: 2, [last]: 3 });
  });

  it("fills the empty parent slot, then refuses a third biological parent", async () => {
    const kid = await createPerson(db, editor, treeId, person("Budi"));
    const dad = await createPerson(db, editor, treeId, person("Ayah Budi", "male"), { kind: "parent", ofId: kid });
    const mom = await createPerson(db, editor, treeId, person("Ibu Budi", "female"), { kind: "parent", ofId: kid });
    const data = await loadTreeData(db, editor, treeId);
    const u = data.unions.find((x) => x.partnerAId === dad)!;
    expect(u.partnerBId).toBe(mom);
    await expect(
      createPerson(db, editor, treeId, person("Orang ketiga"), { kind: "parent", ofId: kid }),
    ).rejects.toBeInstanceOf(UserError);
    // An adoptive parent is a separate union and is allowed.
    await expect(
      createPerson(db, editor, treeId, person("Ayah angkat"), { kind: "parent", ofId: kid, childRelation: "adopted" }),
    ).resolves.toBeTypeOf("string");
  });

  it("rejects cycles and self-partnering", async () => {
    const a = await createPerson(db, editor, treeId, person("Kakek"));
    const b = await createPerson(db, editor, treeId, person("Bapak"), { kind: "child", ofId: a });
    const c = await createPerson(db, editor, treeId, person("Cucu"), { kind: "child", ofId: b });
    await expect(linkExisting(db, editor, treeId, { kind: "child", ofId: c }, a)).rejects.toThrow("cycle");
    await expect(linkExisting(db, editor, treeId, { kind: "parent", ofId: a }, c)).rejects.toThrow("cycle");
    await expect(linkExisting(db, editor, treeId, { kind: "partner", ofId: a }, a)).rejects.toBeInstanceOf(UserError);
    await expect(linkExisting(db, editor, treeId, { kind: "partner", ofId: a }, c)).rejects.toBeInstanceOf(UserError);
  });

  it("deleting a parent keeps the children linked to the other parent", async () => {
    const dad = await createPerson(db, editor, treeId, person("Dadang", "male"));
    const mom = await createPerson(db, editor, treeId, person("Euis", "female"), { kind: "partner", ofId: dad });
    const kid = await createPerson(db, editor, treeId, person("Asep"), { kind: "child", ofId: dad, unionId: (await loadTreeData(db, editor, treeId)).unions.find((u) => u.partnerAId === dad)!.id });
    await deletePerson(db, editor, treeId, dad);
    const data = await loadTreeData(db, editor, treeId);
    const u = data.unions.find((x) => x.partnerAId === mom)!;
    expect(u.partnerBId).toBeNull();
    expect(data.children.some((c) => c.unionId === u.id && c.childId === kid)).toBe(true);
    expect(data.persons.some((p) => p.id === kid)).toBe(true);
  });
});

describe("concurrent edits", () => {
  it("reports a conflict when the row changed since it was opened", async () => {
    const id = await createPerson(db, editor, treeId, person("Siti"));
    const opened = (await loadTreeData(db, editor, treeId)).persons.find((p) => p.id === id)!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    expect(await updatePerson(db, owner, treeId, id, person("Siti Aisyah"), { expectedUpdatedAt: opened })).toEqual({ conflict: false });
    expect(await updatePerson(db, editor, treeId, id, person("Siti A."), { expectedUpdatedAt: opened })).toEqual({ conflict: true });
    expect(await updatePerson(db, editor, treeId, id, person("Siti A."), { expectedUpdatedAt: opened, force: true })).toEqual({ conflict: false });
  });
});
