"use client";

import { FormGroup, FormRow, actionRow, rowInput } from "@/components/form-rows";
import { devLogin } from "@/lib/actions";
import { useFormAction } from "@/lib/use-form-action";

/** Only rendered outside production: lets you try the app without Google credentials. */
export function DevLoginForm({ next }: { next: string }) {
  const [state, onSubmit, pending] = useFormAction(devLogin);
  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-6 text-left">
      <input type="hidden" name="next" value={next} />
      <FormGroup title="Login uji coba (development)" footer={state && !state.ok ? <span className="text-destructive">{state.error}</span> : undefined}>
        <FormRow label="Nama" htmlFor="dev-name">
          <input id="dev-name" name="name" placeholder="Rina Abdullah" required autoComplete="name" className={rowInput} />
        </FormRow>
        <FormRow label="Email" htmlFor="dev-email">
          <input id="dev-email" name="email" type="email" placeholder="rina@contoh.id" required autoComplete="email" spellCheck={false} className={rowInput} />
        </FormRow>
      </FormGroup>
      <FormGroup>
        <button type="submit" disabled={pending} className={actionRow}>
          {pending ? "Memproses…" : "Masuk tanpa Google"}
        </button>
      </FormGroup>
    </form>
  );
}
