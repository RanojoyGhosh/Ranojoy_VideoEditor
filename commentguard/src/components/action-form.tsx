"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/(panel)/actions";
import { cn } from "@/lib/utils";

/** A form bound to a server action that shows its ok/error message underneath. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={cn("space-y-3", className)}>
      {children}
      {state.ok ? (
        <p role="status" className="rounded-xl bg-brand-500/10 px-3 py-2 text-sm text-brand-400">
          {state.ok}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
