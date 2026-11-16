/** Date helpers for the panel (server-side; shown in IST by default). */
import { env } from "@/lib/env";

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: env.timezone,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone: env.timezone, day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}

export function timeAgo(d: Date | string | null | undefined, now = Date.now()): string {
  if (!d) return "never";
  const s = Math.round((now - new Date(d).getTime()) / 1000);
  if (s < 0) return timeUntil(d, now);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d ago`;
  return formatDate(d);
}

export function timeUntil(d: Date | string, now = Date.now()): string {
  const s = Math.round((new Date(d).getTime() - now) / 1000);
  if (s <= 0) return "now";
  if (s < 3600) return `in ${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `in ${Math.round(s / 3600)}h`;
  return `in ${Math.round(s / 86400)}d`;
}

/** Midnight today in the app timezone, as a UTC Date. */
export function startOfTodayLocal(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: env.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const guess = new Date(`${parts}T00:00:00Z`);
  // Offset of the timezone at that moment (e.g. +330 minutes for IST).
  const tzName = new Intl.DateTimeFormat("en-US", { timeZone: env.timezone, timeZoneName: "longOffset" })
    .formatToParts(guess)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = tzName?.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  const offsetMin = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
  return new Date(guess.getTime() - offsetMin * 60_000);
}
