"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Input, Label } from "@/components/ui/input";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" defaultValue={state.email} required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}
      <SubmitButton className="w-full" size="lg" pendingText="Checking…">
        Log in
      </SubmitButton>
    </form>
  );
}
