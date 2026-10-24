import { ChevronRightIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { toolbarAction } from "@/components/form-row-classes";
import { Page, PageTitle } from "@/components/page-shell";
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
      <div className="min-h-[calc(100dvh-3.5rem)] bg-grouped">
        <Page>
          <PageTitle
            eyebrow={`Halo, ${user.name.split(" ")[0]}`}
            title="Pohon keluarga"
            action={
              list.length > 0 ? (
                <Link href="/pohon/baru" className={toolbarAction}>
                  <PlusIcon className="size-5" /> Pohon baru
                </Link>
              ) : null
            }
          />

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
                    <button type="submit" className={toolbarAction}>
                      Buat pohon contoh (±100 orang, development)
                    </button>
                  </form>
                ) : null}
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="mt-6 divide-y divide-border/70 overflow-hidden rounded-xl bg-card">
              {list.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/pohon/${t.id}`}
                    className="flex min-h-14 items-center gap-4 px-4 py-3 transition-colors duration-150 outline-none hover:bg-muted/50 focus-visible:bg-accent/40 active:bg-muted active:duration-0"
                  >
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[1.0625rem] font-semibold">{t.name}</h2>
                      {t.description ? <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{t.description}</p> : null}
                    </div>
                    <span className="shrink-0 text-right text-[15px] text-muted-foreground tabular-nums">
                      {t.personCount} orang
                      <span className="block text-[13px]">{ROLE_LABEL[t.role]}</span>
                    </span>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Page>
      </div>
    </>
  );
}
