import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { addJob, addUsage, readDatabase, updateJob, writeDatabase } from "@/lib/server/db";
import { exportsDir } from "@/lib/server/paths";
import { refreshYouTubeAccessToken, uploadYouTubeVideo } from "@/lib/server/providers/youtube";
import { requireSameOrigin } from "@/lib/server/security";
import { readSecret } from "@/lib/server/secrets";

export async function POST(request: Request) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  const { projectId, videoPath, privacy = "private" } = await request.json();
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === projectId);

  if (!project?.blueprint) {
    return NextResponse.json({ error: "Project blueprint is required before upload." }, { status: 404 });
  }

  const refreshToken = await readSecret("youtubeRefreshToken");
  if (!refreshToken) {
    return NextResponse.json({ error: "Connect YouTube before uploading." }, { status: 409 });
  }

  const job = await addJob({
    type: "youtube-upload",
    projectId,
    status: "running",
    message: "Uploading video to YouTube."
  });

  try {
    const requestedVideoPath = videoPath || project.render?.videoPath;
    if (!requestedVideoPath) {
      return NextResponse.json({ error: "Render an MP4 before uploading." }, { status: 409 });
    }

    const safeRoot = path.resolve(exportsDir);
    const safeVideoPath = path.resolve(requestedVideoPath);
    if (!safeVideoPath.startsWith(safeRoot)) {
      return NextResponse.json({ error: "Video path must be inside the Velvet export folder." }, { status: 400 });
    }

    const video = await readFile(safeVideoPath);
    const token = await refreshYouTubeAccessToken(refreshToken);
    const upload = await uploadYouTubeVideo({
      accessToken: token.access_token,
      video,
      title: project.blueprint.youtube.title,
      description: project.blueprint.youtube.description,
      tags: project.blueprint.youtube.tags,
      privacy
    });

    const record = {
      id: randomUUID(),
      projectId,
      videoId: upload.id,
      url: `https://www.youtube.com/watch?v=${upload.id}`,
      privacy,
      status: "uploaded" as const,
      createdAt: new Date().toISOString()
    };
    const latest = await readDatabase();
    latest.uploads.unshift(record);
    latest.projects = latest.projects.map((item) => (item.id === projectId ? { ...item, status: "uploaded", updatedAt: new Date().toISOString() } : item));
    await writeDatabase(latest);
    await addUsage({ provider: "youtube", projectId, operation: "upload", units: { videos: 1, bytes: video.byteLength } });
    await updateJob(job.id, { status: "completed", message: "Video uploaded to YouTube.", result: record });
    return NextResponse.json({ upload: record });
  } catch (error) {
    await updateJob(job.id, { status: "failed", message: "YouTube upload failed.", error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "YouTube upload failed." }, { status: 500 });
  }
}
