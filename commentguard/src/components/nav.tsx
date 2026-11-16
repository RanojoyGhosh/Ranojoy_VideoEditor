"use client";

import { LayoutDashboard, MessageSquareText, Clapperboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/comments", label: "Comments", icon: MessageSquareText },
  { href: "/posts", label: "Posts", icon: Clapperboard },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Bottom tab bar: thumb-reachable on a phone. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-brand-400" : "text-zinc-400 hover:text-zinc-200",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
