import { AppHeader } from "@/components/app-header";
import { TreeBottomBar, TreeTabs } from "@/components/tree-tabs";
import { loadTreeContext } from "@/lib/tree/context";

export async function generateMetadata({ params }: LayoutProps<"/pohon/[treeId]">) {
  const { treeId } = await params;
  const { tree } = await loadTreeContext(treeId);
  return { title: { default: tree.name, template: `%s · ${tree.name} · Wargi` } };
}

export default async function TreeLayout({ children, params }: LayoutProps<"/pohon/[treeId]">) {
  const { treeId } = await params;
  const { user, tree } = await loadTreeContext(treeId);
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} compactBrand>
        <span className="block truncate border-l pl-3 font-display text-lg sm:text-xl">{tree.name}</span>
      </AppHeader>
      <TreeTabs treeId={treeId} />
      <div className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">{children}</div>
      <TreeBottomBar treeId={treeId} />
    </div>
  );
}
