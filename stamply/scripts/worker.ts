import "dotenv/config";
import { closeDb, getDb } from "../src/db";
import { runMaintenance } from "../src/domain/maintenance";
import { shutdownOcr } from "../src/ocr";

/**
 * Long-running scheduler for local development or a single server.
 * Runs every 60 s: push campaigns, receipt retries, retention clean-up.
 */
const INTERVAL = 60_000;
let running = true;

async function tick() {
  try {
    const r = await runMaintenance(getDb());
    if (r.campaignsRun || r.receiptsRetried || r.receiptImagesPurged || r.rewardsExpired) console.log(JSON.stringify(r));
  } catch (e) {
    console.error("Worker-Fehler:", e);
  }
}

console.log("STAMPLY worker gestartet (Intervall 60 s). Beenden mit Strg+C.");
await tick();
const timer = setInterval(() => running && tick(), INTERVAL);

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    running = false;
    clearInterval(timer);
    await shutdownOcr();
    await closeDb();
    process.exit(0);
  });
}
