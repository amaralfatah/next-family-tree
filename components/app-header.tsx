import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Mark, Wordmark } from "@/components/wordmark";
import type { CurrentUser } from "@/lib/auth/session";

/**
 * `compactBrand` shows only the mark on phones so a tree name has room next to it.
 */
export function AppHeader({ user, children, compactBrand = false }: { user: CurrentUser; children?: React.ReactNode; compactBrand?: boolean }) {
  return (
    <header className="no-print sticky top-0 z-30 border-b bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/pohon" aria-label="Wargi, ke pohon saya" className="shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
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
