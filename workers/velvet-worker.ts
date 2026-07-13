import { processNextQueuedJob } from "../lib/server/job-handlers";

const once = process.argv.includes("--once");
const intervalMs = Number(process.env.VELVET_WORKER_INTERVAL_MS) || 5000;

async function main() {
  console.log(`Velvet worker started${once ? " in one-shot mode" : ""}.`);

  while (true) {
    const job = await processNextQueuedJob();

    if (job) {
      console.log(`Processed ${job.type} job ${job.id}.`);
    } else if (once) {
      console.log("No queued jobs.");
    }

    if (once) {
      break;
    }

    await sleep(intervalMs);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
