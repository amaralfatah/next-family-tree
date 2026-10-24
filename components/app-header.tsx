import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { navBar } from "@/components/nav-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Mark, Wordmark } from "@/components/wordmark";
import type { CurrentUser } from "@/lib/auth/session";

/**
 * `compactBrand` shows only the mark below desktop width so a tree name and the section tabs have room next to it.
 */
export function AppHeader({
  user,
  children,
  nav,
  compactBrand = false,
}: {
  user: CurrentUser;
  children?: React.ReactNode;
  /** Section navigation and toolbar buttons shown inside the bar, before the theme toggle. */
  nav?: React.ReactNode;
  compactBrand?: boolean;
}) {
  const t = useTranslations("common.header");
  return (
    <header className={navBar}>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/trees" aria-label={t("homeAria")} className="flex shrink-0 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
          {compactBrand ? (
            <>
              <Mark className="lg:hidden" />
              <Wordmark className="hidden lg:inline-flex" />
            </>
          ) : (
            <Wordmark />
          )}
        </Link>
        <div className="min-w-0 flex-1">{children}</div>
        {nav}
        <ThemeToggle />
        <UserMenu name={user.name} email={user.email} image={user.image} />
      </div>
    </header>
  );
}
