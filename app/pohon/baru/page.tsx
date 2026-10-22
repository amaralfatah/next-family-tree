import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { NewTreeForm } from "@/components/new-tree-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Pohon baru" };

export default async function NewTreePage() {
  const user = await requireUser("/pohon/baru");
  return (
    <>
      <AppHeader user={user} />
      <main id="konten" className="min-h-[calc(100dvh-3.5rem)] bg-grouped px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-[2.125rem] leading-tight tracking-[-0.02em]">Pohon keluarga baru</h1>
          <p className="mt-2 text-muted-foreground">Mulai dari leluhur tertua yang Anda ketahui. Orang lain bisa ditambahkan dari profilnya.</p>
          <NewTreeForm />
        </div>
      </main>
    </>
  );
}
