"use client";

import { LogOutIcon, TreesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTransition } from "react";
import { logout } from "@/lib/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[\p{L}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function UserMenu({ name, email, image }: { name: string; email: string; image: string | null }) {
  const t = useTranslations("common.userMenu");
  const locale = useLocale();
  const [leaving, startLeaving] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hit rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={t("menuAria")}>
        <Avatar className="size-8">
          {image ? <AvatarImage src={image} alt="" referrerPolicy="no-referrer" /> : null}
          <AvatarFallback className="bg-accent text-xs font-semibold">{initials(name) || "?"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="truncate font-medium text-foreground">{name}</div>
            <div className="truncate text-xs font-normal">{email}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/trees" />}>
          <TreesIcon /> {t("myTrees")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <LanguageSwitcher variant="menu" />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          closeOnClick={false}
          disabled={leaving}
          onClick={() =>
            startLeaving(async () => {
              await logout();
              // A full load, so the next page is rendered from the cleared cookies and no signed-in page stays in the router cache.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the full load is the point
              window.location.assign(`/${locale}`);
            })
          }
        >
          <LogOutIcon /> {leaving ? t("signingOut") : t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
