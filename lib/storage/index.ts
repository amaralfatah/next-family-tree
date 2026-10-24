import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Photos live in Cloudflare R2 when R2_* env vars are set, otherwise on local disk under
 * .data/uploads (development). Objects are never public: they are read through
 * /api/photos, which checks tree membership first.
 */
export const MAX_PHOTO_BYTES = 1_048_576;

const r2Enabled = () =>
  Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

async function s3() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  });
}

const EXT: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export function photoKeyFor(treeId: string, personId: string, contentType: string) {
  return `trees/${treeId}/${personId}-${randomBytes(6).toString("hex")}.${EXT[contentType] ?? "webp"}`;
}

export function contentTypeOf(key: string) {
  return key.endsWith(".jpg") ? "image/jpeg" : key.endsWith(".png") ? "image/png" : "image/webp";
}

function localPath(key: string) {
  const full = path.join(LOCAL_ROOT, key);
  if (!full.startsWith(LOCAL_ROOT)) throw new Error("Invalid key");
  return full;
}

export async function putPhoto(key: string, body: Uint8Array, contentType: string) {
  if (r2Enabled()) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, Body: body, ContentType: contentType }));
    return;
  }
  const file = localPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

/** A short-lived signed URL (R2) or the raw bytes (local). */
export async function readPhoto(key: string): Promise<{ url: string } | { body: Uint8Array } | null> {
  if (r2Enabled()) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const url = await getSignedUrl(await s3(), new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }), { expiresIn: 3600 });
    return { url };
  }
  try {
    return { body: new Uint8Array(await readFile(localPath(key))) };
  } catch {
    return null;
  }
}

export async function deletePhotos(keys: string[]) {
  if (keys.length === 0) return;
  if (r2Enabled()) {
    const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
    const client = await s3();
    for (let i = 0; i < keys.length; i += 1000) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: process.env.R2_BUCKET,
          Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })) },
        }),
      );
    }
    return;
  }
  await Promise.all(keys.map((k) => rm(localPath(k), { force: true })));
}
