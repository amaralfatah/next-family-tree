"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/lib/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      className="mt-6 h-11 w-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await acceptInviteAction(token);
          if (r && !r.ok) toast.error(r.error);
        })
      }
    >
      {pending ? "Bergabung…" : "Gabung ke pohon"}
    </Button>
  );
}
