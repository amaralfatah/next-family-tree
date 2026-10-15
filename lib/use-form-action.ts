"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * useActionState, but submitted through onSubmit so React doesn't reset the form's
 * uncontrolled fields when the server answers with a validation error.
 */
export function useFormAction<S>(action: (state: S | null, fd: FormData) => Promise<S>) {
  const [state, dispatch, pending] = useActionState(action, null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return [state, onSubmit, pending] as const;
}
