// Kinship vocabulary per language. Pure code tables (no message files) so the resolver stays usable on the
// server and in the browser, and stays testable without a translator. Indonesian output is the reference;
// English follows the same level of detail (side and age where the Indonesian term carries it).

import type { Gender } from "../types";

export type KinshipLocale = "id" | "en";

/** -1: the first person is older than the second, 1: younger, 0: unknown. */
export type Age = -1 | 0 | 1;

export interface Lexicon {
  self: string;
  ancestor(n: number, gender: Gender, adopted: boolean): string;
  descendant(n: number, adopted: boolean): string;
  /** Sibling who shares both parents. */
  sibling(gender: Gender, age: Age): string;
  /** Sibling who shares only one parent (or none known), `shared` being that parent's gender. */
  halfSibling(gender: Gender, shared: Gender | null): string;
  cousin(n: number): string;
  /** Parent's sibling; `age` is the uncle/aunt relative to the parent. */
  uncleAunt(gender: Gender, age: Age, parent: Gender): string;
  /** Sibling's child; `age` is the sibling relative to me. */
  nephewNiece(gender: Gender, age: Age, sibling: Gender): string;
  /** Grandparent's sibling. */
  grandUncleAunt(gender: Gender, grandparent: Gender): string;
  grandNephewNiece(gender: Gender): string;
  parentsCousin(parent: Gender): string;
  cousinsChild: string;
  distantBlood(up: number, down: number): string;
  stepParent(gender: Gender): string;
  stepChild: string;
  parentInLaw(gender: Gender): string;
  childInLaw(gender: Gender): string;
  /** Spouse of a sibling or sibling of a spouse; `age` is the sibling relative to the other side. */
  siblingInLaw(gender: Gender, age: Age): string;
  coParentInLaw: string;
  /** Lowercase "husband" / "wife" / "spouse", prefixed with "ex-" once divorced. */
  spouse(gender: Gender, divorced: boolean): string;
  /** Joins "<spouse word>" or "<relative>" with the other half in "Wife of uncle" / "Uncle of wife". */
  of: string;
  distantByMarriage: string;
}

const pick = <T>(g: Gender, male: T, female: T, neutral: T) => (g === "male" ? male : g === "female" ? female : neutral);

const indonesian: Lexicon = {
  self: "Diri sendiri",
  ancestor(n, gender, adopted) {
    switch (n) {
      case 1: {
        const base = pick(gender, "Ayah", "Ibu", "Orang tua");
        return adopted ? `${base} angkat` : base;
      }
      case 2:
        return pick(gender, "Kakek", "Nenek", "Kakek/nenek");
      case 3:
        return pick(gender, "Kakek buyut", "Nenek buyut", "Buyut");
      case 4:
        return "Canggah";
      case 5:
        return "Wareng";
      default:
        return `Leluhur generasi ke-${n}`;
    }
  },
  descendant(n, adopted) {
    switch (n) {
      case 1:
        return adopted ? "Anak angkat" : "Anak";
      case 2:
        return "Cucu";
      case 3:
        return "Cicit";
      case 4:
        return "Piut";
      default:
        return `Keturunan generasi ke-${n}`;
    }
  },
  sibling(gender, age) {
    if (age === 0) return "Saudara kandung";
    return (age < 0 ? "Kakak" : "Adik") + pick(gender, " laki-laki", " perempuan", "");
  },
  halfSibling(_gender, shared) {
    return shared ? pick(shared, "Saudara seayah", "Saudara seibu", "Saudara satu orang tua") : "Saudara";
  },
  cousin(n) {
    if (n === 2) return "Sepupu";
    const times = ["", "", "", "dua", "tiga", "empat", "lima"][n] ?? String(n - 1);
    return `Sepupu ${times} kali`;
  },
  uncleAunt(gender, age, parent) {
    const base = pick(gender, "Paman", "Bibi", "Paman/bibi");
    const sib = age < 0 ? "kakak" : age > 0 ? "adik" : "saudara";
    return `${base} (${sib} ${pick(parent, "ayah", "ibu", "orang tua")})`;
  },
  nephewNiece(_gender, age) {
    return `Keponakan (anak ${age < 0 ? "kakak" : age > 0 ? "adik" : "saudara"})`;
  },
  grandUncleAunt(_gender, grandparent) {
    return "Saudara " + pick(grandparent, "kakek", "nenek", "kakek/nenek");
  },
  grandNephewNiece: () => "Cucu saudara",
  parentsCousin: (parent) => `Sepupu ${pick(parent, "ayah", "ibu", "orang tua")}`,
  cousinsChild: "Anak sepupu",
  distantBlood: (up, down) => `Kerabat sedarah (${up} generasi ke atas, ${down} ke bawah)`,
  stepParent: (gender) => pick(gender, "Ayah tiri", "Ibu tiri", "Orang tua tiri"),
  stepChild: "Anak tiri",
  parentInLaw: (gender) => pick(gender, "Ayah mertua", "Ibu mertua", "Mertua"),
  childInLaw: () => "Menantu",
  siblingInLaw: (_gender, age) => (age < 0 ? "Kakak ipar" : age > 0 ? "Adik ipar" : "Ipar"),
  coParentInLaw: "Besan",
  spouse(gender, divorced) {
    const w = pick(gender, "suami", "istri", "pasangan");
    return divorced ? `mantan ${w}` : w;
  },
  of: "dari",
  distantByMarriage: "Kerabat jauh (melalui pernikahan)",
};

const ordinal = (n: number) => ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh"][n] ?? `${n}th`;

const english: Lexicon = {
  self: "Myself",
  ancestor(n, gender, adopted) {
    switch (n) {
      case 1: {
        const base = pick(gender, "father", "mother", "parent");
        return adopted ? `Adoptive ${base}` : base[0].toUpperCase() + base.slice(1);
      }
      case 2:
        return pick(gender, "Grandfather", "Grandmother", "Grandparent");
      case 3:
        return pick(gender, "Great-grandfather", "Great-grandmother", "Great-grandparent");
      case 4:
        return pick(gender, "Great-great-grandfather", "Great-great-grandmother", "Great-great-grandparent");
      default:
        return `Ancestor (${n} generations up)`;
    }
  },
  descendant(n, adopted) {
    switch (n) {
      case 1:
        return adopted ? "Adopted child" : "Child";
      case 2:
        return "Grandchild";
      case 3:
        return "Great-grandchild";
      case 4:
        return "Great-great-grandchild";
      default:
        return `Descendant (${n} generations down)`;
    }
  },
  sibling(gender, age) {
    const word = pick(gender, "brother", "sister", "sibling");
    if (age === 0) return word[0].toUpperCase() + word.slice(1);
    return `${age < 0 ? "Older" : "Younger"} ${word}`;
  },
  halfSibling(gender, shared) {
    const word = `Half-${pick(gender, "brother", "sister", "sibling")}`;
    return shared ? `${word} (same ${pick(shared, "father", "mother", "parent")})` : "Sibling";
  },
  cousin(n) {
    return `${ordinal(n - 1)} cousin`;
  },
  uncleAunt(gender, age, parent) {
    const base = pick(gender, "Uncle", "Aunt", "Uncle/aunt");
    const sib = pick(gender, "brother", "sister", "sibling");
    const rel = age < 0 ? `older ${sib}` : age > 0 ? `younger ${sib}` : sib;
    return `${base} (${pick(parent, "father", "mother", "parent")}'s ${rel})`;
  },
  nephewNiece(gender, age, sibling) {
    const base = pick(gender, "Nephew", "Niece", "Nephew/niece");
    const sib = pick(sibling, "brother", "sister", "sibling");
    return `${base} (child of ${age < 0 ? `older ${sib}` : age > 0 ? `younger ${sib}` : `${sib}`})`;
  },
  grandUncleAunt(gender, grandparent) {
    const base = pick(gender, "Great-uncle", "Great-aunt", "Great-uncle/aunt");
    return `${base} (${pick(grandparent, "grandfather", "grandmother", "grandparent")}'s ${pick(gender, "brother", "sister", "sibling")})`;
  },
  grandNephewNiece: (gender) => pick(gender, "Grandnephew", "Grandniece", "Grandnephew/niece"),
  parentsCousin: (parent) => `First cousin once removed (${pick(parent, "father", "mother", "parent")}'s cousin)`,
  cousinsChild: "First cousin once removed (cousin's child)",
  distantBlood: (up, down) => `Blood relative (${up} generations up, ${down} down)`,
  stepParent: (gender) => pick(gender, "Stepfather", "Stepmother", "Stepparent"),
  stepChild: "Stepchild",
  parentInLaw: (gender) => pick(gender, "Father-in-law", "Mother-in-law", "Parent-in-law"),
  childInLaw: (gender) => pick(gender, "Son-in-law", "Daughter-in-law", "Child-in-law"),
  siblingInLaw(gender, age) {
    const word = pick(gender, "Brother-in-law", "Sister-in-law", "Sibling-in-law");
    return age < 0 ? `${word} (older)` : age > 0 ? `${word} (younger)` : word;
  },
  coParentInLaw: "Co-parent-in-law (parent of child's spouse)",
  spouse(gender, divorced) {
    const w = pick(gender, "husband", "wife", "spouse");
    return divorced ? `ex-${w}` : w;
  },
  of: "of",
  distantByMarriage: "Distant relative (by marriage)",
};

const LEXICONS: Record<KinshipLocale, Lexicon> = { id: indonesian, en: english };

export function lexiconFor(locale: KinshipLocale): Lexicon {
  return LEXICONS[locale] ?? indonesian;
}
