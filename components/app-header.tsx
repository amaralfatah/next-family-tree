import Link from "next/link";
import { navBar } from "@/components/nav-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Mark, Wordmark } from "@/components/wordmark";
import type { CurrentUser } from "@/lib/auth/session";

/**
 * `compactBrand` shows only the mark on phones so a tree name has room next to it.
 */
export function AppHeader({ user, children, compactBrand = false }: { user: CurrentUser; children?: React.ReactNode; compactBrand?: boolean }) {
  return (
    <header className={navBar}>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/pohon" aria-label="Sararia Family Tree, ke pohon saya" className="flex shrink-0 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
          {compactBrand ? (
            <>
              <Mark className="sm:hidden" />
              <Wordmark className="hidden sm:inline-flex" />
            </>
          ) : (
            <Wordmark />
          )}
        </Link>
        <div className="min-w-0 flex-1">{children}</div>
        <ThemeToggle label="Ganti tema terang/gelap" />
        <UserMenu name={user.name} email={user.email} image={user.image} />
      </div>
    </header>
  );
}
