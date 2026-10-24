import { after, NextResponse, type NextRequest } from "next/server";
import { AccessError, requireRole } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { apiErrors } from "@/lib/api-locale";
import { translateError } from "@/lib/error-message";
import { contentTypeOf, deletePhotos, MAX_PHOTO_BYTES, photoKeyFor, putPhoto, readPhoto } from "@/lib/storage";
import { getPerson, getPersonWith, setPhoto } from "@/lib/tree/service";

type Ctx = RouteContext<"/api/photos/[treeId]/[personId]">;

async function errorResponse(req: NextRequest, e: unknown) {
  if (e instanceof AccessError) return new NextResponse(translateError(await apiErrors(req), e), { status: e.code === "forbidden" ? 403 : 404 });
  if (e instanceof UserError) return new NextResponse(translateError(await apiErrors(req), e), { status: 400 });
  throw e;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { treeId, personId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const person = await getPerson(await getDb(), user.id, treeId, personId);
    if (!person.photoKey) return new NextResponse("Not found", { status: 404 });
    const photo = await readPhoto(person.photoKey);
    if (!photo) return new NextResponse("Not found", { status: 404 });
    // A signed storage URL expires, so the redirect is cached briefly. The body itself never changes for
    // a given URL: lib/person.ts photoUrl() puts the photo key in ?v=, and a new photo gets a new key.
    if ("url" in photo) return NextResponse.redirect(photo.url, { headers: { "Cache-Control": "private, max-age=3600" } });
    return new NextResponse(Buffer.from(photo.body), {
      headers: { "Cache-Control": "private, max-age=31536000, immutable", "Content-Type": contentTypeOf(person.photoKey) },
    });
  } catch (e) {
    return errorResponse(req, e);
  }
}

/** Accepts one image (already compressed in the browser) as multipart field "photo". */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { treeId, personId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return new NextResponse((await apiErrors(req))("photoMissing"), { status: 400 });
  if (file.size > MAX_PHOTO_BYTES) return new NextResponse((await apiErrors(req))("photoTooLarge"), { status: 413 });
  if (!["image/webp", "image/jpeg", "image/png"].includes(file.type)) {
    return new NextResponse((await apiErrors(req))("photoBadFormat"), { status: 415 });
  }
  try {
    const db = await getDb();
    // Check write access before storing anything, so a viewer can't leave orphan objects.
    const access = await requireRole(db, treeId, user.id, "editor");
    await getPersonWith(db, access, personId);
    const key = photoKeyFor(treeId, personId, file.type);
    await putPhoto(key, new Uint8Array(await file.arrayBuffer()), file.type);
    const previous = await setPhoto(db, user.id, treeId, personId, key);
    // The row no longer points at the old file; remove it after the response is sent.
    if (previous) after(() => deletePhotos([previous]));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(req, e);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { treeId, personId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const previous = await setPhoto(await getDb(), user.id, treeId, personId, null);
    // The row no longer points at the old file; remove it after the response is sent.
    if (previous) after(() => deletePhotos([previous]));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(req, e);
  }
}
