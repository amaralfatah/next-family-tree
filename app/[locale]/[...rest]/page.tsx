import { notFound } from "next/navigation";

/** Any path under a valid locale that no page claims renders the localized not-found page. */
export default function CatchAll() {
  notFound();
}
