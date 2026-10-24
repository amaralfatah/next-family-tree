"use client";

import { CameraIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { toolbarAction } from "@/components/form-row-classes";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

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
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: await res.text() };
    router.refresh();
    return { ok: true };
  }

  // Text actions under the avatar, as "Edit" under a contact's photo: tint to change, red to remove.
  return (
    <div className="flex items-center gap-1">
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className={cn(toolbarAction, "text-[15px] disabled:opacity-50")}>
        {busy ? <Spinner /> : <CameraIcon className="size-4" />} {hasPhoto ? "Ganti foto" : "Tambah foto"}
      </button>
      {hasPhoto ? (
        <ConfirmButton
          label="Hapus foto"
          variant="ghost"
          triggerClassName="h-11 px-2 text-[15px] font-normal text-destructive hover:bg-transparent hover:text-destructive hover:opacity-80"
          title="Hapus foto ini?"
          description="Foto dihapus dari pohon dan tidak bisa dikembalikan."
          confirmLabel="Hapus foto"
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
