import { readDatabase } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastFingerprint = "";
  let idleRuns = 0;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode("retry: 1000\nevent: ready\ndata: {}\n\n"));
      const publish = async () => {
        if (closed) return;
        let changed = false;
        try {
          const database = await readDatabase();
          const fingerprint = [
            latestTimestamp(database.projects.map((item) => item.updatedAt)),
            latestTimestamp(database.jobs.map((item) => item.updatedAt)),
            database.uploads[0]?.createdAt,
            database.prompts[0]?.createdAt,
            database.jobs.length,
            database.uploads.length
          ].join(":");
          if (fingerprint !== lastFingerprint) {
            lastFingerprint = fingerprint;
            changed = true;
            controller.enqueue(encoder.encode(`event: studio-update\ndata: ${JSON.stringify({ fingerprint, at: Date.now() })}\n\n`));
          }
        } catch {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        }
        idleRuns = changed ? 0 : idleRuns + 1;
        const delay = changed ? 750 : Math.min(5_000, 750 * 2 ** Math.min(idleRuns, 3));
        timer = setTimeout(publish, delay);
      };
      void publish();
      request.signal.addEventListener("abort", () => {
        closed = true;
        if (timer) clearTimeout(timer);
        controller.close();
      }, { once: true });
    },
    cancel() {
      closed = true;
      if (timer) clearTimeout(timer);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}

function latestTimestamp(values: Array<string | undefined>) {
  return values.reduce<string>((latest, value) => value && value > latest ? value : latest, "");
}
