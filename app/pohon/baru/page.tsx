import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { NewTreeForm } from "@/components/new-tree-form";
import { Page } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Pohon baru" };

export default async function NewTreePage() {
  const user = await requireUser("/pohon/baru");
  return (
    <>
      <AppHeader user={user} />
      <div className="min-h-[calc(100dvh-3.5rem)] bg-grouped">
        <Page className="pt-4">
          <NewTreeForm />
        </Page>
      </div>
    </>
  );
}
