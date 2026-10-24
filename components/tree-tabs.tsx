"use client";

import { HistoryIcon, ListIcon, NetworkIcon, SettingsIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useTabs(treeId: string) {
  const pathname = usePathname();
  const base = `/pohon/${treeId}`;
  // Adding a relative from the chart stays under Pohon, and the tab leads back to the same view.
  const back = useSearchParams().get("kembali");
  const fromChart = pathname === `${base}/orang/baru` && back !== null && (back === base || back.startsWith(`${base}?`));
  return {
    tabs: [
      { href: fromChart ? back : base, label: "Pohon", icon: NetworkIcon, active: pathname === base || fromChart },
      {
        href: `${base}/daftar`,
        label: "Daftar",
        icon: ListIcon,
        active: !fromChart && (pathname.startsWith(`${base}/daftar`) || pathname.startsWith(`${base}/orang`)),
      },
      { href: `${base}/anggota`, label: "Anggota", icon: UsersIcon, active: pathname.startsWith(`${base}/anggota`) },
      { href: `${base}/riwayat`, label: "Riwayat", icon: HistoryIcon, active: pathname.startsWith(`${base}/riwayat`) },
    ],
    settings: { href: `${base}/pengaturan`, active: pathname.startsWith(`${base}/pengaturan`) },
  };
}

const focusRing = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Tablets and up: the sections sit inside the navigation bar, as in an iPadOS or macOS toolbar, so there is
 * one bar above the chart, with settings as a toolbar button. Phones get the bottom bar instead, with
 * settings still up here.
 */
export function TreeTabs({ treeId }: { treeId: string }) {
  const { tabs, settings } = useTabs(treeId);
  return (
    <>
      <nav aria-label="Navigasi pohon" className="hidden shrink-0 items-center gap-0.5 sm:flex">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn(
              "flex h-8 items-center rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:text-foreground",
              focusRing,
              t.active && "bg-muted font-medium text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Link
        href={settings.href}
        aria-label="Pengaturan pohon"
        title="Pengaturan pohon"
        aria-current={settings.active ? "page" : undefined}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hit", settings.active && "bg-muted text-foreground")}
      >
        <SettingsIcon />
      </Link>
    </>
  );
}

/** Thumb-reachable tab bar for phones, padded clear of the home indicator. */
export function TreeBottomBar({ treeId }: { treeId: string }) {
  const { tabs } = useTabs(treeId);
  return (
    <nav
      aria-label="Navigasi pohon"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <div className="grid grid-cols-4">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground outline-none transition-[color,transform] duration-150 active:duration-0 hover:text-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset active:scale-95",
              t.active && "text-foreground",
            )}
          >
            <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", t.active && "bg-accent")}>
              <t.icon className="size-[18px]" />
            </span>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
