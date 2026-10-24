import { AppHeader } from "@/components/app-header";
import { TreeBottomBar, TreeTabs } from "@/components/tree-tabs";
import { loadTreeMeta } from "@/lib/tree/context";

export async function generateMetadata({ params }: LayoutProps<"/[locale]/trees/[treeId]">) {
  const { treeId } = await params;
  const { tree } = await loadTreeMeta(treeId);
  return { title: { default: tree.name, template: `%s · ${tree.name} · Sararia Family Tree` } };
}

export default async function TreeLayout({ children, params }: LayoutProps<"/[locale]/trees/[treeId]">) {
  const { treeId } = await params;
  const { user, tree } = await loadTreeMeta(treeId);
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} compactBrand nav={<TreeTabs treeId={treeId} />}>
        <span className="block truncate border-l border-border pl-3 font-display text-lg sm:text-xl">{tree.name}</span>
      </AppHeader>
      {/* Grouped background (HIG): cards and lists sit on it in white. */}
      <div className="flex flex-1 flex-col bg-grouped pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">{children}</div>
      <TreeBottomBar treeId={treeId} />
    </div>
  );
}
