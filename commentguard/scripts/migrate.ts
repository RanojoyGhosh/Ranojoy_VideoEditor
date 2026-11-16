/**
 * Apply SQL migrations in ./drizzle to DATABASE_URL. Safe to run repeatedly.
 * `--vercel-only`: used by `npm run build`; only migrates when building on Vercel,
 * so every deploy brings the database up to date without any manual step.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  if (process.argv.includes("--vercel-only") && !process.env.VERCEL) return;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("Database is up to date.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
