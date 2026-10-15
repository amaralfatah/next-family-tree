// Domain types shared by the pure modules (graph, kinship, validation) and the UI.
// They mirror the database rows but use plain strings for dates so they can cross
// the server/client boundary without serialization surprises.

export type Gender = "male" | "female" | "unknown";
export type DatePrecision = "day" | "month" | "year" | "unknown";
export type UnionStatus = "married" | "divorced" | "widowed" | "unknown";
export type ChildRelation = "biological" | "adopted" | "step";
export type Role = "owner" | "editor" | "viewer";

export interface Person {
  id: string;
  fullName: string;
  nickname: string | null;
  gender: Gender;
  /** ISO date (YYYY-MM-DD). With precision "year" only the year is meaningful. */
  birthDate: string | null;
  birthPrecision: DatePrecision;
  birthPlace: string | null;
  isLiving: boolean;
  deathDate: string | null;
  deathPrecision: DatePrecision;
  photoKey: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface Union {
  id: string;
  partnerAId: string;
  partnerBId: string | null;
  status: UnionStatus;
  startDate: string | null;
  orderIndex: number;
}

export interface UnionChild {
  unionId: string;
  childId: string;
  relation: ChildRelation;
  birthOrder: number | null;
}

/** Everything inside one tree that the chart, list, and kinship need. */
export interface TreeData {
  persons: Person[];
  unions: Union[];
  children: UnionChild[];
}
