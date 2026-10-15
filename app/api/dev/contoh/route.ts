import { NextResponse, type NextRequest } from "next/server";
import { devLoginEnabled, getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { createDemoTree } from "@/lib/demo";

/** Development only: creates the fictional demo family for the signed-in user. */
export async function POST(request: NextRequest) {
  if (!devLoginEnabled()) return new NextResponse("Not found", { status: 404 });
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const treeId = await createDemoTree(await getDb(), user.id);
  return NextResponse.redirect(new URL(`/pohon/${treeId}`, request.url), 303);
}
