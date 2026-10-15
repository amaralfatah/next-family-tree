"use client";

import { devLogin } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Only rendered outside production: lets you try the app without Google credentials. */
export function DevLoginForm({ next }: { next: string }) {
  const [state, onSubmit, pending] = useFormAction(devLogin);
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3 border-t border-dashed pt-5">
      <p className="text-xs font-medium tracking-wide text-soga-ink uppercase">Login uji coba (development)</p>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="dev-name">Nama</Label>
        <Input id="dev-name" name="name" placeholder="Rina Abdullah" required autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dev-email">Email</Label>
        <Input id="dev-email" name="email" type="email" placeholder="rina@contoh.id" required autoComplete="email" />
      </div>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" variant="secondary" className="h-10 w-full" disabled={pending}>
        {pending ? "Memproses…" : "Masuk tanpa Google"}
      </Button>
    </form>
  );
}
