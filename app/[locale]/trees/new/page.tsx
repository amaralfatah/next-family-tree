import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import { NewTreeForm } from "@/components/new-tree-form";
import { Page } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/session";

export async function generateMetadata({ params }: PageProps<"/[locale]/trees/new">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "trees" });
  return { title: t("newTree.metaTitle") };
}

export default async function NewTreePage() {
  const user = await requireUser("/trees/new");
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
