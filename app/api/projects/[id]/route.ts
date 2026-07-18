import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { readDatabase, updateProject, writeDatabase } from "@/lib/server/db";
import { requireSameOrigin } from "@/lib/server/security";
import type { ProductionSettings, ProjectRecord } from "@/lib/server/types";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === id);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    project,
    prompts: database.prompts.filter((prompt) => prompt.projectId === id),
    jobs: database.jobs.filter((job) => job.projectId === id),
    uploads: database.uploads.filter((upload) => upload.projectId === id),
    usage: database.usage.filter((usage) => usage.projectId === id)
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  const { id } = await context.params;
  const body = await request.json();
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === id);

  if (!project?.blueprint) {
    return NextResponse.json({ error: "Project blueprint is required before editing." }, { status: 404 });
  }

  const production = body.production && typeof body.production === "object"
    ? {
        gapSeconds: clampNumber(body.production.gapSeconds, project.production?.gapSeconds ?? 1.5, 0, 10),
        fadeSeconds: clampNumber(body.production.fadeSeconds, project.production?.fadeSeconds ?? 0.8, 0, 5),
        targetLufs: clampNumber(body.production.targetLufs, project.production?.targetLufs ?? -14, -24, -8),
        stylePreset: cleanString(body.production.stylePreset) || project.production?.stylePreset,
        scheduledPublishAt: cleanString(body.production.scheduledPublishAt) || project.production?.scheduledPublishAt,
        artworkAssetId: readArtworkAssetId(body.production.artworkAssetId, project),
        visualPreset: readVisualPreset(body.production.visualPreset, project.production?.visualPreset),
        filterIntensity: clampNumber(body.production.filterIntensity, project.production?.filterIntensity ?? 70, 0, 100),
        overlayOpacity: clampNumber(body.production.overlayOpacity, project.production?.overlayOpacity ?? 55, 0, 100),
        grain: clampNumber(body.production.grain, project.production?.grain ?? 18, 0, 100),
        flicker: clampNumber(body.production.flicker, project.production?.flicker ?? 8, 0, 100),
        vignette: clampNumber(body.production.vignette, project.production?.vignette ?? 28, 0, 100),
        dust: clampNumber(body.production.dust, project.production?.dust ?? 5, 0, 100),
        exportSize: readExportSize(body.production.exportSize, project.production?.exportSize),
        exportFormat: readExportFormat(body.production.exportFormat, project.production?.exportFormat),
        exportQuality: readExportQuality(body.production.exportQuality, project.production?.exportQuality)
      }
    : project.production;
  const tracks = Array.isArray(body.tracks)
    ? body.tracks.slice(0, 20).map((track: Record<string, unknown>, index: number) => ({
        title: cleanString(track.title) || project.blueprint!.tracks[index]?.title || `Track ${index + 1}`,
        durationSeconds: clampNumber(track.durationSeconds, project.blueprint!.tracks[index]?.durationSeconds ?? 180, 30, 600),
        prompt: cleanString(track.prompt) || project.blueprint!.tracks[index]?.prompt || "Instrumental music",
        mood: cleanString(track.mood) || project.blueprint!.tracks[index]?.mood || "cinematic"
      }))
    : project.blueprint.tracks;
  let generatedTracks = project.generatedTracks;
  let trackVersions = project.trackVersions;
  if (body.versionAction && typeof body.versionAction === "object") {
    const title = cleanString(body.versionAction.title);
    const versionId = cleanString(body.versionAction.versionId);
    const version = trackVersions?.[title]?.find((item) => item.id === versionId || String(item.version) === versionId);
    if (version && body.versionAction.type === "select") {
      generatedTracks = project.blueprint.tracks.flatMap((track) => {
        const generated = track.title === title ? version : generatedTracks?.find((item) => item.title === track.title);
        return generated ? [generated] : [];
      });
    }
    if (version && body.versionAction.type === "approve") {
      const approved = { ...version, approvedAt: new Date().toISOString() };
      trackVersions = { ...trackVersions, [title]: (trackVersions?.[title] ?? []).map((item) => item === version ? approved : item) };
      generatedTracks = project.blueprint.tracks.flatMap((track) => {
        const generated = track.title === title ? approved : generatedTracks?.find((item) => item.title === track.title);
        return generated ? [generated] : [];
      });
    }
  }

  const updated = await updateProject(id, {
    title: body.title || project.title,
    blueprint: {
      ...project.blueprint,
      title: body.title || project.blueprint.title,
      concept: body.concept ?? project.blueprint.concept,
      coverPrompt: body.coverPrompt ?? project.blueprint.coverPrompt,
      videoPrompt: body.videoPrompt ?? project.blueprint.videoPrompt,
      tracks,
      youtube: {
        ...project.blueprint.youtube,
        title: body.youtubeTitle ?? project.blueprint.youtube.title,
        description: body.youtubeDescription ?? project.blueprint.youtube.description,
        tags:
          typeof body.youtubeTags === "string"
            ? body.youtubeTags
                .split(",")
                .map((tag: string) => tag.trim())
                .filter(Boolean)
            : project.blueprint.youtube.tags
      }
    },
    production,
    generatedTracks,
    trackVersions
  });

  return NextResponse.json({ project: updated });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;
  const { id } = await context.params;
  const body = await request.json();
  if (body.action !== "duplicate") return NextResponse.json({ error: "Unsupported project action." }, { status: 400 });
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const now = new Date().toISOString();
  const duplicate = { ...project, id: randomUUID(), title: `${project.title} Copy`, status: "blueprint" as const, generatedTracks: undefined, trackVersions: undefined, render: undefined, approvedAt: undefined, createdAt: now, updatedAt: now };
  database.projects.unshift(duplicate);
  await writeDatabase(database);
  return NextResponse.json({ project: duplicate });
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 8000) : "";
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function readArtworkAssetId(value: unknown, project: ProjectRecord) {
  const id = cleanString(value);
  return project.referenceAssets?.some((asset) => asset.id === id && asset.kind === "artwork") ? id : project.production?.artworkAssetId;
}

function readVisualPreset(value: unknown, fallback?: ProductionSettings["visualPreset"]) {
  return ["clean", "velvet", "rose-film", "midnight", "noir", "mono"].includes(String(value))
    ? value as "clean" | "velvet" | "rose-film" | "midnight" | "noir" | "mono"
    : fallback ?? "velvet";
}

function readExportSize(value: unknown, fallback?: ProductionSettings["exportSize"]) {
  return ["1080p", "720p", "shorts", "square"].includes(String(value))
    ? value as NonNullable<ProductionSettings["exportSize"]>
    : fallback ?? "1080p";
}

function readExportFormat(value: unknown, fallback?: ProductionSettings["exportFormat"]) {
  return ["mp4", "webm"].includes(String(value))
    ? value as NonNullable<ProductionSettings["exportFormat"]>
    : fallback ?? "mp4";
}

function readExportQuality(value: unknown, fallback?: ProductionSettings["exportQuality"]) {
  return ["draft", "standard", "high"].includes(String(value))
    ? value as NonNullable<ProductionSettings["exportQuality"]>
    : fallback ?? "standard";
}
