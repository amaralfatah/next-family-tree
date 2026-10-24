import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware Link, usePathname, useRouter and getPathname. Pass unprefixed paths ("/trees"), they gain /id or /en. */
export const { Link, usePathname, useRouter, getPathname } = createNavigation(routing);
