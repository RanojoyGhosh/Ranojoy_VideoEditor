import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getSessionEmail()) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
          <ShieldCheck className="size-7" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-bold">CommentGuard</h1>
          <p className="text-sm text-zinc-400">Admin login</p>
        </div>
      </div>
      <LoginForm />
    </main>
  );
}
