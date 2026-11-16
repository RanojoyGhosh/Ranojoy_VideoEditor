/** Run one bot tick from the terminal (same as the cron endpoint). */
import "dotenv/config";

async function main() {
  const { runTick } = await import("../src/lib/tick");
  const r = await runTick();
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
