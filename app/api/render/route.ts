import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { addJob, addUsage, readDatabase, updateJob, writeDatabase } from "@/lib/server/db";
import { exportsDir } from "@/lib/server/paths";
import { requireSameOrigin } from "@/lib/server/security";

const execFileAsync = promisify(execFile);
const ffmpegBinary = process.env.FFMPEG_PATH || "ffmpeg";

export async function POST(request: Request) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  const { projectId } = await request.json();
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const maxRenderAttempts = database.setup.budget?.maxRenderAttemptsPerProject ?? 5;
  const renderAttempts = database.usage.filter((usage) => usage.projectId === projectId && usage.operation === "render").length;
  if (renderAttempts >= maxRenderAttempts) {
    return NextResponse.json({ error: `Render guardrail reached for this project (${maxRenderAttempts} attempts).` }, { status: 409 });
  }

  const job = await addJob({
    type: "render",
    projectId,
    status: "running",
    message: "Preparing render manifest."
  });

  const manifest = {
    id: randomUUID(),
    projectId,
    title: project.title,
    blueprint: project.blueprint,
    createdAt: new Date().toISOString(),
    tracks: project.generatedTracks ?? [],
    nextStep: "Install FFmpeg and generate tracks to produce MP4 output."
  };
  const projectDir = path.join(exportsDir, project.id);
  await mkdir(projectDir, { recursive: true });
  const filePath = path.join(projectDir, "render-manifest.json");
  await writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`);

  let renderStatus: "blocked" | "rendered" = "blocked";
  let message = "Render manifest created. FFmpeg is required for MP4 composition.";
  let videoPath: string | undefined;

  if (project.generatedTracks?.length) {
    try {
      await execFileAsync(ffmpegBinary, ["-version"]);
      videoPath = path.join(projectDir, `${project.id}.mp4`);
      await execFileAsync(ffmpegBinary, buildAlbumRenderArgs(project.generatedTracks, videoPath));
      renderStatus = "rendered";
      message = "Full album MP4 rendered with FFmpeg.";
    } catch {
      message = "Render package is ready, but FFmpeg is not available to Velvet or could not render the video. Set FFMPEG_PATH if it is not on PATH.";
    }
  } else {
    message = "Render manifest created. Generate music tracks before MP4 composition.";
  }

  const latest = await readDatabase();
  latest.projects = latest.projects.map((item) =>
    item.id === projectId
      ? {
          ...item,
          status: renderStatus === "rendered" ? "rendered" : item.status,
          render: { manifestPath: filePath, videoPath, status: renderStatus, message },
          updatedAt: new Date().toISOString()
        }
      : item
  );
  await writeDatabase(latest);
  await addUsage({
    provider: "ffmpeg",
    projectId,
    operation: "render",
    units: {
      renders: renderStatus === "rendered" ? 1 : 0,
      seconds: project.generatedTracks?.reduce((sum, track) => sum + track.durationSeconds, 0) ?? 0
    }
  });
  await updateJob(job.id, { status: renderStatus === "rendered" ? "completed" : "blocked", message, result: { manifestPath: filePath, videoPath } });

  return NextResponse.json({ manifest, manifestPath: filePath, videoPath, status: renderStatus, message });
}

function buildAlbumRenderArgs(tracks: Array<{ filePath: string; durationSeconds: number }>, videoPath: string) {
  const totalSeconds = Math.max(
    1,
    tracks.reduce((sum, track) => sum + track.durationSeconds, 0)
  );
  const baseArgs = [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=0b0712:s=1920x1080:r=30:d=${totalSeconds}`,
    ...tracks.flatMap((track) => ["-i", track.filePath])
  ];

  const audioArgs =
    tracks.length === 1
      ? ["-map", "0:v", "-map", "1:a"]
      : [
          "-filter_complex",
          `${tracks.map((_, index) => `[${index + 1}:a]`).join("")}concat=n=${tracks.length}:v=0:a=1[aout]`,
          "-map",
          "0:v",
          "-map",
          "[aout]"
        ];

  return [
    ...baseArgs,
    ...audioArgs,
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-pix_fmt",
    "yuv420p",
    "-shortest",
    videoPath
  ];
}
