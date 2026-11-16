import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full min-h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-zinc-300", className)} {...props} />;
}
