import { PlusIcon, UsersRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { buttonVariants } from "@/components/ui/button";
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
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Halo, {user.name.split(" ")[0]}</p>
            <h1 className="font-display text-4xl tracking-tight">Pohon keluarga</h1>
          </div>
          {list.length > 0 ? (
            <Link href="/pohon/baru" className={buttonVariants({ size: "lg" })}>
              <PlusIcon data-icon="inline-start" /> Pohon baru
            </Link>
          ) : null}
        </div>

        {list.length === 0 ? (
          <div className="relative mt-10 overflow-hidden rounded-2xl border bg-card px-6 py-14 text-center">
            <div aria-hidden className="kawung absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
            <div className="relative mx-auto max-w-md">
              <h2 className="font-display text-3xl">Mulai dari satu nama</h2>
              <p className="mt-3 text-muted-foreground">
                Buat pohon untuk keluarga besar Anda, mulai dari leluhur tertua yang diketahui atau dari diri sendiri. Anggota lain bisa
                diundang setelahnya.
              </p>
              <Link href="/pohon/baru" className={buttonVariants({ size: "lg", className: "mt-6 h-11 px-5" })}>
                <PlusIcon data-icon="inline-start" /> Buat pohon pertama
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">Diundang keluarga? Buka link undangan yang dibagikan kepada Anda.</p>
              {devLoginEnabled() ? (
                <form action="/api/dev/contoh" method="post" className="mt-4">
                  <button type="submit" className="text-sm text-soga-ink underline underline-offset-4">
                    Buat pohon contoh (±100 orang, development)
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t, i) => (
              <li key={t.id} className="rise" style={{ animationDelay: `${i * 50}ms` }}>
                <Link
                  href={`/pohon/${t.id}`}
                  className="group flex h-full flex-col rounded-xl border bg-card p-5 transition-[border-color,box-shadow,translate] outline-none hover:-translate-y-0.5 hover:border-soga/60 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-2xl leading-tight">{t.name}</h2>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{ROLE_LABEL[t.role]}</span>
                  </div>
                  {t.description ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{t.description}</p> : null}
                  <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm text-muted-foreground">
                    <UsersRoundIcon className="size-4" /> {t.personCount} orang tercatat
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
