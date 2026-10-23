import { Suspense } from "react";
import { FamilyChart } from "@/components/chart/family-chart";
import { WelcomeBanner } from "@/components/welcome-banner";
import { loadTreeContext } from "@/lib/tree/context";

export default async function ChartPage({ params, searchParams }: PageProps<"/pohon/[treeId]">) {
  const { treeId } = await params;
  const sp = await searchParams;
  const { tree, data, mePersonId, canEdit } = await loadTreeContext(treeId);
  // The chart never shows notes or birthplaces; leave them out of the client payload.
  const chartData = { ...data, persons: data.persons.map((p) => ({ ...p, notes: null, birthPlace: null })) };
  return (
    <main id="konten" className="flex flex-1 flex-col">
      <h1 className="sr-only">Pohon {tree.name}</h1>
      {sp.baru === "1" || !mePersonId ? <WelcomeBanner treeId={treeId} joined={sp.baru === "1"} linked={Boolean(mePersonId)} /> : null}
      <Suspense>
        <FamilyChart
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
