import { ChevronRightIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { devLoginEnabled, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/person";
import { listTreesForUser } from "@/lib/tree/service";

export const metadata: Metadata = { title: "Pohon saya" };

export default async function TreesPage() {
  const user = await requireUser("/pohon");
  const list = await listTreesForUser(await getDb(), user.id);

  return (
    <>
      <AppHeader user={user} />
      <main id="konten" className="min-h-[calc(100dvh-3.5rem)] bg-grouped">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Halo, {user.name.split(" ")[0]}</p>
              <h1 className="font-display text-[2.125rem] leading-tight tracking-[-0.02em]">Pohon keluarga</h1>
            </div>
            {list.length > 0 ? (
              <Link href="/pohon/baru" className={buttonVariants()}>
                <PlusIcon data-icon="inline-start" /> Pohon baru
              </Link>
            ) : null}
          </div>

          {list.length === 0 ? (
            <Empty className="mt-6 rounded-xl bg-card">
              <EmptyHeader>
                <EmptyTitle>Mulai dari satu nama</EmptyTitle>
                <EmptyDescription>
                  Buat pohon untuk keluarga besar Anda, mulai dari leluhur tertua yang diketahui atau dari diri sendiri. Anggota lain bisa diundang
                  setelahnya.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link href="/pohon/baru" className={buttonVariants({ size: "lg" })}>
                  <PlusIcon data-icon="inline-start" /> Buat pohon pertama
                </Link>
                <p className="text-sm text-muted-foreground">Diundang keluarga? Buka link undangan yang dibagikan kepada Anda.</p>
                {devLoginEnabled() ? (
                  <form action="/api/dev/contoh" method="post">
                    <button type="submit" className="text-sm font-medium underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
                      Buat pohon contoh (±100 orang, development)
                    </button>
                  </form>
                ) : null}
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="mt-6 divide-y overflow-hidden rounded-xl bg-card">
              {list.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/pohon/${t.id}`}
                    className="group flex items-center gap-4 px-4 py-3.5 transition-colors outline-none hover:bg-muted focus-visible:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset active:bg-muted active:duration-0"
                  >
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[1.0625rem] font-semibold">{t.name}</h2>
                      {t.description ? <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{t.description}</p> : null}
                    </div>
                    <span className="shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                      {t.personCount} orang
                      <span className="block text-xs">{ROLE_LABEL[t.role]}</span>
                    </span>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
