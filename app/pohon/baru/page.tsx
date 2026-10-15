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
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl tracking-tight">Pohon keluarga baru</h1>
        <p className="mt-2 text-muted-foreground">Mulai dari leluhur tertua yang Anda ketahui. Orang lain bisa ditambahkan dari profilnya.</p>
        <NewTreeForm />
      </main>
    </>
  );
}
