"use client";

import { CameraIcon, LoaderIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 1_048_576;
const MAX_SIDE = 800;

/** Downscale and re-encode in the browser so uploads stay under 1 MB. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.85, 0.72, 0.6, 0.45]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    // Older Safari silently falls back to PNG; retry as JPEG, which compresses well everywhere.
    const out = blob && blob.type === "image/webp" ? blob : await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (out && out.size <= MAX_BYTES) return out;
  }
  throw new Error("too-big");
}

export function PhotoUploader({ treeId, personId, hasPhoto }: { treeId: string; personId: string; hasPhoto: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const url = `/api/foto/${treeId}/${personId}`;

  async function upload(file: File) {
    setBusy(true);
    try {
      const blob = await compress(file);
      const fd = new FormData();
      fd.set("photo", new File([blob], "foto", { type: blob.type }));
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Foto tersimpan.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error && e.message !== "too-big" && e.message ? e.message : "Foto gagal diunggah. Coba gambar lain.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    const res = await fetch(url, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else toast.error(await res.text());
  }

  return (
    <div className="flex gap-1">
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <LoaderIcon className="animate-spin" /> : <CameraIcon />} {hasPhoto ? "Ganti" : "Foto"}
      </Button>
      {hasPhoto ? (
        <Button variant="ghost" size="icon-sm" disabled={busy} onClick={remove} aria-label="Hapus foto">
          <Trash2Icon />
        </Button>
      ) : null}
    </div>
  );
}
