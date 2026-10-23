"use client";

import { HistoryIcon, ListIcon, NetworkIcon, SettingsIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

function useTabs(treeId: string) {
  const pathname = usePathname();
  const base = `/pohon/${treeId}`;
  // Adding a relative from the chart stays under Bagan, and the tab leads back to the same view.
  const back = useSearchParams().get("kembali");
  const fromChart = pathname === `${base}/orang/baru` && back !== null && (back === base || back.startsWith(`${base}?`));
  return [
    { href: fromChart ? back : base, label: "Bagan", icon: NetworkIcon, active: pathname === base || fromChart },
    {
      href: `${base}/daftar`,
      label: "Daftar",
      icon: ListIcon,
      active: !fromChart && (pathname.startsWith(`${base}/daftar`) || pathname.startsWith(`${base}/orang`)),
    },
    { href: `${base}/anggota`, label: "Anggota", icon: UsersIcon, active: pathname.startsWith(`${base}/anggota`) },
    { href: `${base}/riwayat`, label: "Riwayat", icon: HistoryIcon, active: pathname.startsWith(`${base}/riwayat`) },
    { href: `${base}/pengaturan`, label: "Atur", icon: SettingsIcon, active: pathname.startsWith(`${base}/pengaturan`) },
  ];
}

/**
 * Wide screens: the sections sit inside the navigation bar, so there is one bar above the content.
 * Tablets: underline tabs under the header. Phones get the bottom bar instead.
 */
export function TreeTabs({ treeId, inline = false }: { treeId: string; inline?: boolean }) {
  const tabs = useTabs(treeId);
  if (inline) {
    return (
      <nav aria-label="Navigasi pohon" className="hidden shrink-0 items-center gap-0.5 lg:flex">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              t.active && "bg-muted font-medium text-foreground",
            )}
          >
            <t.icon className="size-4" />
            {t.label === "Atur" ? "Pengaturan" : t.label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav aria-label="Navigasi pohon" className="no-print hidden border-b bg-background sm:block lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-sm text-muted-foreground rounded-md transition-colors outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              t.active && "font-medium text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-soga",
            )}
          >
            <t.icon className="size-4" />
            {t.label === "Atur" ? "Pengaturan" : t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Thumb-reachable tab bar for phones, padded clear of the home indicator. */
export function TreeBottomBar({ treeId }: { treeId: string }) {
  const tabs = useTabs(treeId);
  return (
    <nav
      aria-label="Navigasi pohon"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <div className="grid grid-cols-5">
        {tabs.map((t) => (
          <Link
            key={t.href}
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
