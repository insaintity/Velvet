import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { addJob, addUsage, readDatabase, updateJob, writeDatabase } from "@/lib/server/db";
import { exportsDir } from "@/lib/server/paths";
import { generateMusicTrack } from "@/lib/server/providers/elevenlabs";
import { requireSameOrigin } from "@/lib/server/security";
import { readSecret } from "@/lib/server/secrets";

export async function POST(request: Request) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  const { projectId } = await request.json();
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === projectId);

  if (!project?.blueprint) {
    return NextResponse.json({ error: "Project blueprint is required before generating music." }, { status: 404 });
  }

  const elevenLabsKey = await readSecret("elevenlabs");
  if (!elevenLabsKey) {
    return NextResponse.json({ error: "ElevenLabs setup is required before music generation." }, { status: 409 });
  }

  const job = await addJob({
    type: "music",
    projectId,
    status: "running",
    message: "Generating album tracks."
  });

  try {
    const projectDir = path.join(exportsDir, project.id);
    await mkdir(projectDir, { recursive: true });
    const tracks: Array<{ title: string; filePath: string; durationSeconds: number }> = [];

    for (const [index, track] of project.blueprint.tracks.entries()) {
      const audio = await generateMusicTrack({
        apiKey: elevenLabsKey,
        prompt: track.prompt,
        durationSeconds: track.durationSeconds
      });
      const filePath = path.join(projectDir, `${String(index + 1).padStart(2, "0")}-${slugify(track.title)}.mp3`);
      await writeFile(filePath, audio);
      tracks.push({ title: track.title, filePath, durationSeconds: track.durationSeconds });
    }

    const latest = await readDatabase();
    latest.projects = latest.projects.map((item) =>
      item.id === projectId ? { ...item, status: "generating", generatedTracks: tracks, updatedAt: new Date().toISOString() } : item
    );
    await writeDatabase(latest);
    await addUsage({
      provider: "elevenlabs",
      projectId,
      operation: "music-generation",
      units: { tracks: tracks.length, seconds: tracks.reduce((sum, track) => sum + track.durationSeconds, 0) }
    });
    await updateJob(job.id, { status: "completed", message: "Music tracks generated.", result: { tracks } });

    return NextResponse.json({ tracks });
  } catch (error) {
    await updateJob(job.id, { status: "failed", message: "Music generation failed.", error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Music generation failed." }, { status: 500 });
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}
