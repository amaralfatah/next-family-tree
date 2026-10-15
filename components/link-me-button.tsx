"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { linkMeAction } from "@/lib/actions";

export function LinkMeButton({ treeId, personId, unlink = false }: { treeId: string; personId: string; unlink?: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant={unlink ? "ghost" : "default"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await linkMeAction(treeId, unlink ? null : personId);
          if (!r.ok) {
            toast.error(r.error);
            return;
          }
          toast.success(unlink ? "Tautan akun dilepas." : "Tersimpan. Kini hubungan Anda dengan setiap kerabat terlihat.");
          if (!unlink) router.push(`/pohon/${treeId}/orang/${personId}`);
        })
      }
    >
      {unlink ? "Bukan saya" : "Ini saya"}
    </Button>
  );
}
