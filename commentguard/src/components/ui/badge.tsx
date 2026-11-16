import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5", {
  variants: {
    tone: {
      neutral: "bg-zinc-800 text-zinc-300",
      brand: "bg-brand-500/15 text-brand-400",
      warn: "bg-amber-500/15 text-amber-300",
      danger: "bg-red-500/15 text-red-300",
      info: "bg-sky-500/15 text-sky-300",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
