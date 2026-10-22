import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["owner", "editor", "viewer"]);
export const genderEnum = pgEnum("gender", ["male", "female", "unknown"]);
export const precisionEnum = pgEnum("date_precision", ["day", "month", "year", "unknown"]);
export const unionStatusEnum = pgEnum("union_status", ["married", "divorced", "widowed", "unknown"]);
export const childRelationEnum = pgEnum("child_relation", ["biological", "adopted", "step"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    image: text("image"),
    /** Neon Auth (Better Auth) user id. Null for development-only test logins. */
    authId: text("auth_id"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), uniqueIndex("users_auth_id_idx").on(t.authId)],
);

/** Session id is the SHA-256 of the cookie token, so a leaked table can't be replayed. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const trees = pgTable("trees", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  /** Default focus of the chart (usually the eldest ancestor). */
  rootPersonId: uuid("root_person_id"),
  createdAt: createdAt(),
});

export const persons = pgTable(
  "persons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treeId: uuid("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    nickname: text("nickname"),
    gender: genderEnum("gender").notNull().default("unknown"),
    birthDate: date("birth_date"),
    birthPrecision: precisionEnum("birth_precision").notNull().default("unknown"),
    birthPlace: text("birth_place"),
    isLiving: boolean("is_living").notNull().default(true),
    deathDate: date("death_date"),
    deathPrecision: precisionEnum("death_precision").notNull().default("unknown"),
    photoKey: text("photo_key"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("persons_tree_idx").on(t.treeId)],
);

export const treeMembers = pgTable(
  "tree_members",
  {
    treeId: uuid("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    personId: uuid("person_id").references(() => persons.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.treeId, t.userId] }), index("tree_members_user_idx").on(t.userId)],
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treeId: uuid("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    role: roleEnum("role").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("invites_token_idx").on(t.tokenHash), index("invites_tree_idx").on(t.treeId)],
);

export const unions = pgTable(
  "unions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treeId: uuid("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    partnerAId: uuid("partner_a_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    partnerBId: uuid("partner_b_id").references(() => persons.id, { onDelete: "cascade" }),
    status: unionStatusEnum("status").notNull().default("married"),
    startDate: date("start_date"),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => [index("unions_tree_idx").on(t.treeId)],
);

export const unionChildren = pgTable(
  "union_children",
  {
    unionId: uuid("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    childId: uuid("child_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    relation: childRelationEnum("relation").notNull().default("biological"),
    birthOrder: integer("birth_order"),
  },
  (t) => [primaryKey({ columns: [t.unionId, t.childId] }), index("union_children_child_idx").on(t.childId)],
);

export const changeLog = pgTable(
  "change_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treeId: uuid("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id"),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    diff: jsonb("diff"),
    createdAt: createdAt(),
  },
  (t) => [index("change_log_tree_idx").on(t.treeId, t.createdAt)],
);

export const treeMembersRelations = relations(treeMembers, ({ one }) => ({
  user: one(users, { fields: [treeMembers.userId], references: [users.id] }),
  tree: one(trees, { fields: [treeMembers.treeId], references: [trees.id] }),
}));
