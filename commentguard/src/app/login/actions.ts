"use server";

import { redirect } from "next/navigation";
import { checkAdminPassword, MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getSettings, setSetting } from "@/lib/settings";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export type LoginState = { error?: string; email?: string };

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const s = await getSettings(["auth.failCount", "auth.lockedUntil"]);
  if (s["auth.lockedUntil"] && Date.parse(s["auth.lockedUntil"]) > Date.now()) {
    return { error: `Too many wrong attempts. Try again after ${LOCK_MINUTES} minutes.`, email };
  }

  if (!env.adminPasswordHash && (env.adminPassword?.length ?? 0) < MIN_ADMIN_PASSWORD_LENGTH) {
    return { error: `Set ADMIN_PASSWORD (at least ${MIN_ADMIN_PASSWORD_LENGTH} characters) or ADMIN_PASSWORD_HASH in the environment variables.`, email };
  }
  // Always run the password check so timing doesn't reveal whether the email matched.
  const passwordOk = await checkAdminPassword(password, { hash: env.adminPasswordHash, plain: env.adminPassword });
  if (!passwordOk || email !== env.adminEmail) {
    const fails = (s["auth.failCount"] ?? 0) + 1;
    if (fails >= MAX_FAILURES) {
      await setSetting("auth.lockedUntil", new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString());
      await setSetting("auth.failCount", 0);
    } else {
      await setSetting("auth.failCount", fails);
    }
    return { error: "Wrong email or password.", email };
  }

  await setSetting("auth.failCount", 0);
  await setSetting("auth.lockedUntil", null);
  await createSession(email);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
