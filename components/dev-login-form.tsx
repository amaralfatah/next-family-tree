"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { devLogin } from "@/lib/actions";
import { useFormAction } from "@/lib/use-form-action";

/** Only rendered outside production: lets you try the app without Google credentials. */
export function DevLoginForm({ next }: { next: string }) {
  const [state, onSubmit, pending] = useFormAction(devLogin);
  return (
    <form onSubmit={onSubmit} className="mt-6 border-t border-dashed pt-5">
      <input type="hidden" name="next" value={next} />
      <FieldGroup className="gap-3">
        <p className="text-sm font-semibold">Login uji coba (development)</p>
        <Field>
          <FieldLabel htmlFor="dev-name">Nama</FieldLabel>
          <Input id="dev-name" name="name" placeholder="Rina Abdullah…" required autoComplete="name" />
        </Field>
        <Field>
          <FieldLabel htmlFor="dev-email">Email</FieldLabel>
          <Input id="dev-email" name="email" type="email" placeholder="rina@contoh.id…" required autoComplete="email" spellCheck={false} />
        </Field>
        {state && !state.ok ? <FieldError>{state.error}</FieldError> : null}
        <Button type="submit" variant="secondary" className="h-10 w-full" disabled={pending}>
          {pending ? "Memproses…" : "Masuk tanpa Google"}
        </Button>
      </FieldGroup>
    </form>
  );
}
