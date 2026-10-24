"use client";

import { useTranslations } from "next-intl";
import { translateError } from "@/lib/error-message";

/** For client code that calls a service directly (the in-browser demo): turns a thrown UserError into text. */
export function useErrorMessage() {
  const t = useTranslations("errors");
  return (error: unknown) => translateError(t, error);
}
