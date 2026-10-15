import { NextResponse, type NextRequest } from "next/server";
import { AccessError, requireRole } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { contentTypeOf, deletePhotos, MAX_PHOTO_BYTES, photoKeyFor, putPhoto, readPhoto } from "@/lib/storage";
import { getPerson, setPhoto } from "@/lib/tree/service";

type Ctx = RouteContext<"/api/foto/[treeId]/[personId]">;

function errorResponse(e: unknown) {
  if (e instanceof AccessError) return new NextResponse(e.message, { status: e.code === "forbidden" ? 403 : 404 });
  if (e instanceof UserError) return new NextResponse(e.message, { status: 400 });
  throw e;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { treeId, personId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const person = await getPerson(await getDb(), user.id, treeId, personId);
    if (!person.photoKey) return new NextResponse("Not found", { status: 404 });
    const photo = await readPhoto(person.photoKey);
    if (!photo) return new NextResponse("Not found", { status: 404 });
    const headers = { "Cache-Control": "private, max-age=3600" };
    if ("url" in photo) return NextResponse.redirect(photo.url, { headers });
    return new NextResponse(Buffer.from(photo.body), { headers: { ...headers, "Content-Type": contentTypeOf(person.photoKey) } });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Accepts one image (already compressed in the browser) as multipart field "photo". */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { treeId, personId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return new NextResponse("Foto tidak ditemukan.", { status: 400 });
  if (file.size > MAX_PHOTO_BYTES) return new NextResponse("Ukuran foto maksimal 1 MB.", { status: 413 });
  if (!["image/webp", "image/jpeg", "image/png"].includes(file.type)) {
    return new NextResponse("Format foto harus WebP, JPEG, atau PNG.", { status: 415 });
  }
  try {
    const db = await getDb();
    // Check write access before storing anything, so a viewer can't leave orphan objects.
    await requireRole(db, treeId, user.id, "editor");
    await getPerson(db, user.id, treeId, personId);
    const key = photoKeyFor(treeId, personId, file.type);
    await putPhoto(key, new Uint8Array(await file.arrayBuffer()), file.type);
    const previous = await setPhoto(db, user.id, treeId, personId, key);
    if (previous) await deletePhotos([previous]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { treeId, personId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const previous = await setPhoto(await getDb(), user.id, treeId, personId, null);
    if (previous) await deletePhotos([previous]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
