import { NextResponse } from "next/server";
import { readDatabase } from "@/lib/server/db";
import { readMedia } from "@/lib/server/media-storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === id);
  if (!project?.render?.videoPath && !project?.render?.videoStoragePath) {
    return NextResponse.json({ error: "Rendered video not found." }, { status: 404 });
  }

  try {
    const video = await readMedia(project.render.videoPath, project.render.videoStoragePath, database.setup);
    const extension = readVideoExtension(project.render.videoPath, project.render.videoStoragePath, project.production?.exportFormat);
    return new Response(video, {
      headers: {
        "Content-Type": extension === "webm" ? "video/webm" : "video/mp4",
        "Content-Length": String(video.byteLength),
        "Content-Disposition": `attachment; filename="${safeFileName(project.title)}.${extension}"`,
        "Cache-Control": "private, max-age=3600"
      }
    });
  } catch {
    return NextResponse.json({ error: "Rendered video is unavailable on this worker." }, { status: 404 });
  }
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "velvet-export";
}

function readVideoExtension(videoPath?: string, storagePath?: string, format?: string) {
  const source = `${videoPath ?? ""} ${storagePath ?? ""}`.toLowerCase();
  if (source.includes(".webm") || format === "webm") return "webm";
  return "mp4";
}
