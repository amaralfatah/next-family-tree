"use client";

import { PersonFields } from "@/components/person-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/lib/use-form-action";
import { createTreeAction } from "@/lib/actions";

export function NewTreeForm() {
  const [state, onSubmit, pending] = useFormAction(createTreeAction);
  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-8">
      <FieldGroup className="gap-4 rounded-2xl bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-[-0.01em]">Tentang pohon</h2>
        <Field>
          <FieldLabel htmlFor="treeName">Nama pohon</FieldLabel>
          <Input id="treeName" name="treeName" required maxLength={120} autoComplete="off" placeholder="mis. “Bani H. Abdullah” atau “Keluarga Besar Sukardi”…" />
        </Field>
        <Field>
          <FieldLabel htmlFor="treeDescription">Deskripsi (opsional)</FieldLabel>
          <Textarea id="treeDescription" name="treeDescription" rows={2} maxLength={1000} placeholder="Asal daerah, catatan untuk anggota keluarga…" />
        </Field>
      </FieldGroup>

      <section className="grid gap-4 rounded-2xl bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.01em]">Orang pertama</h2>
          <p className="mt-1 text-sm text-muted-foreground">Biasanya leluhur tertua. Orang ini menjadi pusat bagan secara bawaan.</p>
        </div>
        <PersonFields idPrefix="first" />
        <FieldLabel htmlFor="isMe">
          <Field orientation="horizontal">
            <Checkbox id="isMe" name="isMe" value="on" />
            <FieldContent>
              <FieldTitle>Orang ini adalah saya</FieldTitle>
              <FieldDescription>Bisa diatur nanti dari profil siapa pun di pohon.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
      </section>

      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="sticky bottom-[env(safe-area-inset-bottom)] z-20 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Membuat…" : "Buat pohon"}
        </Button>
      </div>
    </form>
  );
}
