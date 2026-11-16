import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/** shadcn/ui-style button with phone-sized tap targets (min 44px). */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-brand-500 text-zinc-950 hover:bg-brand-400",
        secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
        outline: "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800",
        ghost: "text-zinc-300 hover:bg-zinc-800",
        destructive: "bg-red-500 text-white hover:bg-red-400",
      },
      size: {
        default: "min-h-11 px-4",
        sm: "min-h-9 px-3 text-xs",
        lg: "min-h-12 px-5 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
