import Link from "next/link";
import { Suspense } from "react";
import { FamilyChart } from "@/components/chart/family-chart";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Mark, Wordmark } from "@/components/wordmark";
import { loadPublicDemo } from "@/lib/demo-public";

export const metadata = {
  title: "Contoh pohon keluarga",
  description: "Coba bagan keluarga fiktif empat generasi tanpa masuk, lengkap dengan sebutan hubungan seperti paman, sepupu, dan besan.",
};

// Built once at build time from the fictional demo generator; no session or real data involved.
export const dynamic = "force-static";

export default async function DemoPage() {
  const demo = await loadPublicDemo();
  const me = demo.data.persons.find((p) => p.id === demo.meId)!;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-30 border-b bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" aria-label="Sararia Family Tree, ke beranda" className="shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Mark className="sm:hidden" />
            <Wordmark className="hidden sm:inline-flex" />
          </Link>
          <span className="min-w-0 flex-1 truncate border-l pl-3 font-display text-lg sm:text-xl">{demo.name}</span>
          <ThemeToggle label="Ganti tema terang/gelap" />
          <Link href="/masuk" className={buttonVariants({ size: "sm", className: "h-8" })}>
            Buat pohon
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <h1 className="sr-only">Contoh bagan {demo.name}</h1>
        <div className="no-print border-b bg-accent/60">
          <p className="mx-auto max-w-6xl px-4 py-2 text-[13px] sm:py-2.5 sm:text-sm">
            Keluarga fiktif. Anda ditandai sebagai <strong className="font-semibold">{me.fullName}</strong>. Ketuk siapa pun untuk melihat sebutan
            hubungannya dengan Anda.
          </p>
        </div>
        <Suspense>
          <FamilyChart
            treeId="contoh"
            treeName={demo.name}
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
