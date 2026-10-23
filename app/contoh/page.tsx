import Link from "next/link";
import { Suspense } from "react";
import { navBar } from "@/components/nav-bar";
import { FamilyChart } from "@/components/chart/family-chart";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Mark, Wordmark } from "@/components/wordmark";
import { loadPublicDemo } from "@/lib/demo-public";

export const metadata = {
  title: "Contoh pohon keluarga",
  description: "Coba pohon keluarga fiktif empat generasi tanpa masuk, lengkap dengan sebutan hubungan seperti paman, sepupu, dan besan.",
};

// Built once at build time from the fictional demo generator; no session or real data involved.
export const dynamic = "force-static";

export default async function DemoPage() {
  const demo = await loadPublicDemo();
  const me = demo.data.persons.find((p) => p.id === demo.meId)!;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className={navBar}>
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" aria-label="Sararia Family Tree, ke beranda" className="flex shrink-0 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
            <Mark className="sm:hidden" />
            <Wordmark className="hidden sm:inline-flex" />
          </Link>
          <span className="min-w-0 flex-1 truncate border-l border-border pl-3 font-display text-lg sm:text-xl">{demo.name}</span>
          <ThemeToggle label="Ganti tema terang/gelap" />
          <Link href="/masuk" className={buttonVariants({ size: "sm" })}>
            Buat pohon
          </Link>
        </div>
      </header>
      <main id="konten" className="flex flex-1 flex-col">
        <h1 className="sr-only">Contoh pohon {demo.name}</h1>
        <div className="no-print border-b bg-paper-2">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-[13px] sm:py-2.5 sm:text-sm">
            <p className="min-w-0 flex-1">
              Keluarga fiktif. Anda ditandai sebagai <strong className="font-semibold">{me.fullName}</strong>.
              <span className="max-sm:hidden"> Ketuk siapa pun untuk melihat sebutan hubungannya dengan Anda.</span>
            </p>
            <Link href="/demo" className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })}>
              Coba ubah
            </Link>
          </div>
        </div>
        <Suspense>
          <FamilyChart
            treeId="contoh"
            data={demo.data}
            rootPersonId={demo.focusId}
            mePersonId={demo.meId}
            canEdit={false}
            demo
            initialSelectedId={demo.relativeId}
          />
        </Suspense>
      </main>
    </div>
  );
}
