import { Suspense } from "react";
import { FamilyChart } from "@/components/chart/family-chart";
import { WelcomeBanner } from "@/components/welcome-banner";
import { loadTreeContext } from "@/lib/tree/context";

export default async function ChartPage({ params, searchParams }: PageProps<"/pohon/[treeId]">) {
  const { treeId } = await params;
  const sp = await searchParams;
  const { tree, data, mePersonId, canEdit } = await loadTreeContext(treeId);
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">Bagan {tree.name}</h1>
      {sp.baru === "1" || !mePersonId ? <WelcomeBanner treeId={treeId} joined={sp.baru === "1"} linked={Boolean(mePersonId)} /> : null}
      <Suspense>
        <FamilyChart
          treeId={treeId}
          treeName={tree.name}
          data={data}
          rootPersonId={tree.rootPersonId}
          mePersonId={mePersonId}
          canEdit={canEdit}
        />
      </Suspense>
    </main>
  );
}
