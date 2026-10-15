import { NextResponse, type NextRequest } from "next/server";
import { AccessError } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { exportTree } from "@/lib/tree/service";

export async function GET(_req: NextRequest, ctx: RouteContext<"/pohon/[treeId]/ekspor">) {
  const { treeId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const backup = await exportTree(await getDb(), user.id, treeId);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="wargi-${treeId.slice(0, 8)}-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AccessError) return new NextResponse("Not found", { status: 404 });
    throw e;
  }
}
