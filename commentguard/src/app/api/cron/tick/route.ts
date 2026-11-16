/**
 * Called every minute by Supabase pg_cron (or cron-job.org):
 *   POST /api/cron/tick   with header  Authorization: Bearer <CRON_SECRET>
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { runTick } from "@/lib/tick";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(env.cronSecret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const r = await runTick({ budgetMs: 45_000 });
    return NextResponse.json({ ok: r.ok, skipped: r.skipped ?? null, summary: r.summary, ms: r.ms });
  } catch (err) {
    console.error("tick failed", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
