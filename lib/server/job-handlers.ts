import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { addUsage, claimNextQueuedJob, readDatabase, updateJob, writeDatabase } from "./db";
import { materializeMedia, persistMedia, readMedia } from "./media-storage";
import { exportsDir } from "./paths";
import { generateMusicTrack } from "./providers/elevenlabs";
import { refreshYouTubeAccessToken, uploadYouTubeVideo } from "./providers/youtube";
import { readSecret } from "./secrets";
import type { GeneratedTrack, JobRecord, ProjectRecord, ProductionSettings } from "./types";

const execFileAsync = promisify(execFile);
const ffmpegBinary = process.env.FFMPEG_PATH || "ffmpeg";

export async function processNextQueuedJob() {
  const job = await claimNextQueuedJob();
  if (!job) {
    return undefined;
  }

  await processJob(job);
  return job;
}

export async function processJob(job: JobRecord) {
  try {
    if (job.type === "music") {
      await processMusicJob(job);
      return;
    }

    if (job.type === "render") {
      await processRenderJob(job);
      return;
    }

    if (job.type === "youtube-upload") {
      await processYouTubeUploadJob(job);
      return;
    }

    await updateJob(job.id, { status: "blocked", message: `${job.type} jobs are not handled by the worker yet.` });
  } catch (error) {
    await markProjectFailed(job).catch(() => undefined);
    await updateJob(job.id, {
      status: "failed",
      message: `${job.type} job failed.`,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

async function markProjectFailed(job: JobRecord) {
  if (!job.projectId) return;
  const database = await readDatabase();
  database.projects = database.projects.map((project) => (project.id === job.projectId ? { ...project, status: "failed", updatedAt: new Date().toISOString() } : project));
  await writeDatabase(database);
}

async function processMusicJob(job: JobRecord) {
  const projectId = requireProjectId(job);
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === projectId);

  if (!project?.blueprint) {
    throw new Error("Project blueprint is required before generating music.");
  }

  const maxTracks = database.setup.budget?.maxTracksPerRun ?? 10;
  if (project.blueprint.tracks.length > maxTracks) {
    throw new Error(`This blueprint has ${project.blueprint.tracks.length} tracks. Budget guardrail allows ${maxTracks} per run.`);
  }

  const elevenLabsKey = await readSecret("elevenlabs");
  if (!elevenLabsKey) {
    throw new Error("ElevenLabs setup is required before music generation.");
  }

  await updateJob(job.id, { message: "Generating album tracks." });
  const projectDir = path.join(exportsDir, project.id);
  await mkdir(projectDir, { recursive: true });
  const requestedTrackTitle = typeof job.payload?.trackTitle === "string" ? job.payload.trackTitle : undefined;
  const trackEntries = project.blueprint.tracks.map((track, index) => ({ track, index })).filter(({ track }) => !requestedTrackTitle || track.title === requestedTrackTitle);
  if (!trackEntries.length) throw new Error("The requested track was not found in this project.");
  const tracks: GeneratedTrack[] = [];

  for (const { track, index } of trackEntries) {
    const version = (project.trackVersions?.[track.title]?.length ?? 0) + 1;
    const audio = await generateMusicTrack({
      apiKey: elevenLabsKey,
      prompt: track.prompt,
      durationSeconds: track.durationSeconds
    });
    const filePath = path.join(projectDir, `${String(index + 1).padStart(2, "0")}-${slugify(track.title)}-v${version}.mp3`);
    await writeFile(filePath, audio);
    const storagePath = await persistMedia(filePath, `projects/${project.id}/audio/${path.basename(filePath)}`, "audio/mpeg", database.setup);
    tracks.push({ id: randomUUID(), title: track.title, filePath, storagePath, durationSeconds: track.durationSeconds, version, prompt: track.prompt, createdAt: new Date().toISOString() });
  }

  const latest = await readDatabase();
  latest.projects = latest.projects.map((item) =>
    item.id === projectId ? updateGeneratedProject(item, project.blueprint!.tracks, tracks) : item
  );
  await writeDatabase(latest);
  await addUsage({
    provider: "elevenlabs",
    projectId,
    operation: "music-generation",
    units: { tracks: tracks.length, seconds: tracks.reduce((sum, track) => sum + track.durationSeconds, 0) }
  });
  await updateJob(job.id, { status: "completed", message: tracks.length === 1 ? "Music track generated." : "Music tracks generated.", result: { tracks } });
}

function updateGeneratedProject(project: ProjectRecord, blueprintTracks: NonNullable<ProjectRecord["blueprint"]>["tracks"], tracks: GeneratedTrack[]) {
  const generatedTracks = blueprintTracks.flatMap((blueprintTrack) => {
    const generated = tracks.find((track) => track.title === blueprintTrack.title) ?? project.generatedTracks?.find((track) => track.title === blueprintTrack.title);
    return generated ? [generated] : [];
  });
  const allTracksGenerated = blueprintTracks.length > 0 && generatedTracks.length >= blueprintTracks.length;
  return {
    ...project,
    status: allTracksGenerated ? "generated" as const : "generating" as const,
    generatedTracks,
    trackVersions: tracks.reduce((versions, track) => ({ ...versions, [track.title]: [...(project.trackVersions?.[track.title] ?? []), track] }), project.trackVersions ?? {}),
    updatedAt: new Date().toISOString()
  };
}

async function processRenderJob(job: JobRecord) {
  const projectId = requireProjectId(job);
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === projectId);

  if (!project) {
    throw new Error("Project not found.");
  }

  const maxRenderAttempts = database.setup.budget?.maxRenderAttemptsPerProject ?? 5;
  const renderAttempts = database.usage.filter((usage) => usage.projectId === projectId && usage.operation === "render").length;
  if (renderAttempts >= maxRenderAttempts) {
    throw new Error(`Render guardrail reached for this project (${maxRenderAttempts} attempts).`);
  }

  await updateJob(job.id, { message: "Preparing shared tracks and render manifest." });
  const selectedTracks = project.blueprint?.tracks.flatMap((track) => {
    const generated = project.generatedTracks?.find((item) => item.title === track.title);
    return generated ? [generated] : [];
  }) ?? project.generatedTracks ?? [];
  const renderTracks = await Promise.all(selectedTracks.map(async (track) => ({
    ...track,
    filePath: await materializeMedia({ localPath: track.filePath, storagePath: track.storagePath, fallbackName: `${project.id}-${track.id ?? slugify(track.title)}.mp3`, setup: database.setup })
  })));
  const artwork = project.referenceAssets?.find((asset) => asset.id === project.production?.artworkAssetId && asset.kind === "artwork")
    ?? project.referenceAssets?.find((asset) => asset.kind === "artwork");
  let artworkPath: string | undefined;
  if (artwork) {
    try {
      artworkPath = await materializeMedia({ localPath: artwork.filePath, storagePath: artwork.storagePath, fallbackName: `${project.id}-${artwork.id}${path.extname(artwork.name) || ".jpg"}`, setup: database.setup });
    } catch {
      artworkPath = undefined;
    }
  }
  const silenceAnalysis = renderTracks.length ? await analyzeSilence(renderTracks) : [];
  const manifest = {
    id: randomUUID(),
    projectId,
    title: project.title,
    blueprint: project.blueprint,
    createdAt: new Date().toISOString(),
    tracks: project.generatedTracks ?? [],
    production: project.production,
    artwork: artwork ? { id: artwork.id, name: artwork.name, storagePath: artwork.storagePath } : undefined,
    silenceAnalysis,
    nextStep: "Install FFmpeg and generate tracks to produce MP4 output."
  };
  const projectDir = path.join(exportsDir, project.id);
  await mkdir(projectDir, { recursive: true });
  const filePath = path.join(projectDir, "render-manifest.json");
  await writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`);
  const manifestStoragePath = await persistMedia(filePath, `projects/${project.id}/renders/render-manifest.json`, "application/json", database.setup);

  let renderStatus: "blocked" | "rendered" = "blocked";
  let message = "Render manifest created. FFmpeg is required for MP4 composition.";
  let videoPath: string | undefined;
  let videoStoragePath: string | undefined;

  if (renderTracks.length) {
    try {
      await execFileAsync(ffmpegBinary, ["-version"]);
      videoPath = path.join(projectDir, `${project.id}.mp4`);
      await execFileAsync(ffmpegBinary, buildAlbumRenderArgs(renderTracks, videoPath, project.production, artworkPath));
      videoStoragePath = await persistMedia(videoPath, `projects/${project.id}/renders/${project.id}.mp4`, "video/mp4", database.setup);
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
          status: renderStatus === "rendered" ? "rendered" : statusAfterBlockedRender(item),
          render: { manifestPath: filePath, manifestStoragePath, videoPath, videoStoragePath, status: renderStatus, message },
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
  await updateJob(job.id, { status: renderStatus === "rendered" ? "completed" : "blocked", message, result: { manifestPath: filePath, manifestStoragePath, videoPath, videoStoragePath } });
}

function statusAfterBlockedRender(project: ProjectRecord): ProjectRecord["status"] {
  if (project.generatedTracks?.length) return "generated";
  return project.approvedAt ? "approved" : "blueprint";
}

async function analyzeSilence(tracks: GeneratedTrack[]) {
  return Promise.all(tracks.map(async (track) => {
    try {
      const { stderr } = await execFileAsync(ffmpegBinary, ["-hide_banner", "-i", track.filePath, "-af", "silencedetect=n=-50dB:d=1.5", "-f", "null", "-"]);
      return { title: track.title, silentSections: (stderr.match(/silence_start:/g) ?? []).length, analyzed: true };
    } catch {
      return { title: track.title, silentSections: 0, analyzed: false };
    }
  }));
}

async function processYouTubeUploadJob(job: JobRecord) {
  const projectId = requireProjectId(job);
  const privacy = readPrivacy(job.payload?.privacy);
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === projectId);

  if (!project?.blueprint) {
    throw new Error("Project blueprint is required before upload.");
  }

  const refreshToken = await readSecret("youtubeRefreshToken");
  if (!refreshToken) {
    throw new Error("Connect YouTube before uploading.");
  }

  const requestedVideoPath = typeof job.payload?.videoPath === "string" ? job.payload.videoPath : project.render?.videoPath;
  if (!requestedVideoPath && !project.render?.videoStoragePath) {
    throw new Error("Render an MP4 before uploading.");
  }
  const safeVideoPath = await materializeMedia({ localPath: requestedVideoPath, storagePath: project.render?.videoStoragePath, fallbackName: `${project.id}.mp4`, setup: database.setup });
  const mediaIdentity = project.render?.videoStoragePath || safeVideoPath;
  const idempotencyKey = createHash("sha256").update(`${projectId}:${mediaIdentity}:${privacy}`).digest("hex");
  const existingUpload = database.uploads.find((upload) => upload.status === "uploaded" && upload.idempotencyKey === idempotencyKey);
  if (existingUpload) {
    await updateJob(job.id, { status: "completed", message: "Upload already exists. Returning existing YouTube record.", result: existingUpload });
    return;
  }

  await updateJob(job.id, { message: "Uploading video to YouTube." });
  const video = await readMedia(safeVideoPath, project.render?.videoStoragePath, database.setup);
  const token = await refreshYouTubeAccessToken(refreshToken);
  const upload = await uploadYouTubeVideo({
    accessToken: token.access_token,
    video,
    title: project.blueprint.youtube.title,
    description: project.blueprint.youtube.description,
    tags: project.blueprint.youtube.tags,
    privacy
  });

  await addUsage({ provider: "youtube", projectId, operation: "upload", units: { videos: 1, bytes: video.byteLength } });
  const latest = await readDatabase();
  const record = {
    id: randomUUID(),
    projectId,
    projectTitle: project.title,
    videoId: upload.id,
    url: `https://www.youtube.com/watch?v=${upload.id}`,
    videoPath: safeVideoPath,
    videoStoragePath: project.render?.videoStoragePath,
    manifestPath: project.render?.manifestPath,
    manifestStoragePath: project.render?.manifestStoragePath,
    idempotencyKey,
    prompts: latest.prompts
      .filter((prompt) => prompt.projectId === projectId)
      .map((prompt) => ({
        kind: prompt.kind,
        prompt: prompt.prompt,
        response: prompt.response,
        version: prompt.version
      })),
    usage: latest.usage.filter((usage) => usage.projectId === projectId),
    privacy,
    status: "uploaded" as const,
    createdAt: new Date().toISOString()
  };
  latest.uploads.unshift(record);
  latest.projects = latest.projects.map((item) => (item.id === projectId ? { ...item, status: "uploaded", updatedAt: new Date().toISOString() } : item));
  await writeDatabase(latest);
  await updateJob(job.id, { status: "completed", message: "Video uploaded to YouTube.", result: record });
}

function requireProjectId(job: JobRecord) {
  if (!job.projectId) {
    throw new Error("Project ID is required for this job.");
  }

  return job.projectId;
}

function readPrivacy(value: unknown): "private" | "unlisted" | "public" {
  return value === "unlisted" || value === "public" ? value : "private";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

function buildAlbumRenderArgs(tracks: GeneratedTrack[], videoPath: string, production?: ProductionSettings, artworkPath?: string) {
  const gapSeconds = Math.max(0, Math.min(10, production?.gapSeconds ?? 1.5));
  const fadeSeconds = Math.max(0, Math.min(5, production?.fadeSeconds ?? 0.8));
  const targetLufs = Math.max(-24, Math.min(-8, production?.targetLufs ?? -14));
  const totalSeconds = Math.max(
    1,
    tracks.reduce((sum, track) => sum + track.durationSeconds, 0) + Math.max(0, tracks.length - 1) * gapSeconds
  );
  const baseArgs = artworkPath
    ? ["-y", "-loop", "1", "-framerate", "30", "-i", artworkPath, ...tracks.flatMap((track) => ["-i", track.filePath])]
    : ["-y", "-f", "lavfi", "-i", `color=c=0b0712:s=1920x1080:r=30:d=${totalSeconds}`, ...tracks.flatMap((track) => ["-i", track.filePath])];

  const filters = tracks.map((track, index) => {
    const fadeOutStart = Math.max(0, track.durationSeconds - fadeSeconds);
    const fade = fadeSeconds > 0 ? `,afade=t=in:st=0:d=${fadeSeconds},afade=t=out:st=${fadeOutStart}:d=${fadeSeconds}` : "";
    const gap = index < tracks.length - 1 && gapSeconds > 0 ? `,apad=pad_dur=${gapSeconds}` : "";
    return `[${index + 1}:a]loudnorm=I=${targetLufs}:TP=-1.5:LRA=11${fade}${gap}[a${index}]`;
  });
  const audioArgs = [
    "-filter_complex",
    `${buildVideoFilter(production)};${filters.join(";")};${tracks.map((_, index) => `[a${index}]`).join("")}concat=n=${tracks.length}:v=0:a=1[aout]`,
    "-map",
    "[vout]",
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
    "-r",
    "30",
    "-shortest",
    videoPath
  ];
}

function buildVideoFilter(production?: ProductionSettings) {
  const intensity = clampPercent(production?.filterIntensity, 70) / 100;
  const overlay = clampPercent(production?.overlayOpacity, 55) / 100;
  const grain = clampPercent(production?.grain, 18) / 100 * overlay;
  const dust = clampPercent(production?.dust, 5) / 100 * overlay;
  const flicker = clampPercent(production?.flicker, 8) / 100 * overlay;
  const vignette = clampPercent(production?.vignette, 28) / 100 * overlay;
  const filters = ["[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080", visualPresetFilter(production?.visualPreset ?? "velvet", intensity)];
  const noiseAmount = Math.round(grain * 28 + dust * 16);
  if (noiseAmount > 0) filters.push(`noise=alls=${noiseAmount}:allf=t+u`);
  if (flicker > 0) filters.push(`eq=brightness='${(flicker * 0.055).toFixed(4)}*sin(2*PI*t*8.7)':eval=frame`);
  if (vignette > 0) filters.push(`vignette=angle=${(0.18 + vignette * 0.62).toFixed(3)}`);
  filters.push("format=yuv420p[vout]");
  return filters.filter(Boolean).join(",");
}

function visualPresetFilter(preset: ProductionSettings["visualPreset"], intensity: number) {
  const mix = (base: number, change: number) => (base + change * intensity).toFixed(3);
  if (preset === "clean") return "";
  if (preset === "noir") return `hue=s=${mix(1, -0.72)},eq=contrast=${mix(1, 0.24)}:brightness=${mix(0, -0.035)}`;
  if (preset === "mono") return `hue=s=${mix(1, -1)},eq=contrast=${mix(1, 0.13)}`;
  if (preset === "rose-film") return `eq=saturation=${mix(1, -0.08)}:contrast=${mix(1, 0.09)}:brightness=${mix(0, 0.018)},colorbalance=rs=${mix(0, 0.12)}:bs=${mix(0, -0.055)}`;
  if (preset === "midnight") return `eq=saturation=${mix(1, -0.18)}:contrast=${mix(1, 0.18)}:brightness=${mix(0, -0.065)},colorbalance=bs=${mix(0, 0.11)}:rs=${mix(0, -0.045)}`;
  return `eq=saturation=${mix(1, 0.12)}:contrast=${mix(1, 0.12)}:brightness=${mix(0, -0.025)},colorbalance=rs=${mix(0, 0.07)}:bs=${mix(0, 0.035)}`;
}

function clampPercent(value: number | undefined, fallback: number) {
  return Math.max(0, Math.min(100, value ?? fallback));
}
