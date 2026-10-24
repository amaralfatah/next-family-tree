import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { TreeChart } from "@/components/tree-chart";
import { WelcomeBanner } from "@/components/welcome-banner";
import { loadTreeContext } from "@/lib/tree/context";

export default async function ChartPage({ params, searchParams }: PageProps<"/[locale]/trees/[treeId]">) {
  const { treeId } = await params;
  const sp = await searchParams;
  const t = await getTranslations("trees");
  const { tree, data, mePersonId, canEdit } = await loadTreeContext(treeId);
  // The chart never shows notes or birthplaces; leave them out of the client payload (the edit dialog fetches them).
  const chartData = { ...data, persons: data.persons.map((p) => ({ ...p, notes: null, birthPlace: null })) };
  return (
    <main id="content" className="flex flex-1 flex-col">
      <h1 className="sr-only">{t("chart.heading", { name: tree.name })}</h1>
      {sp.welcome === "1" || !mePersonId ? <WelcomeBanner treeId={treeId} joined={sp.welcome === "1"} linked={Boolean(mePersonId)} /> : null}
      <Suspense>
        <TreeChart
          treeId={treeId}
          data={chartData}
          rootPersonId={tree.rootPersonId}
          mePersonId={mePersonId}
          canEdit={canEdit}
        />
      </Suspense>
    </main>
  );
}
