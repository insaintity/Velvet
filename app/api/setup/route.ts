import { NextResponse } from "next/server";
import { readDatabase, updateSetup } from "@/lib/server/db";
import { requireSameOrigin } from "@/lib/server/security";
import { hasSecret, saveSecret } from "@/lib/server/secrets";

export async function GET() {
  const database = await readDatabase();
  return NextResponse.json({
    setup: database.setup,
    secrets: {
      openai: await hasSecret("openai"),
      elevenlabs: await hasSecret("elevenlabs"),
      youtube: await hasSecret("youtubeRefreshToken"),
      youtubeOAuth: await hasSecret("googleClientId") && await hasSecret("googleClientSecret"),
      database: await hasSecret("databaseUrl"),
      storage: await hasSecret("supabaseServiceRole")
    }
  });
}

export async function POST(request: Request) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  const body = await request.json();

  await saveSecret("openai", body.openaiApiKey ?? "");
  await saveSecret("elevenlabs", body.elevenLabsApiKey ?? "");
  await saveSecret("googleClientId", body.googleClientId ?? "");
  await saveSecret("googleClientSecret", body.googleClientSecret ?? "");
  await saveSecret("databaseUrl", body.databaseUrl ?? "");
  await saveSecret("workerSecret", body.workerSecret ?? "");
  await saveSecret("supabaseServiceRole", body.supabaseServiceRoleKey ?? "");
  const hasOpenAI = Boolean(body.openaiApiKey) || (await hasSecret("openai"));
  const hasElevenLabs = Boolean(body.elevenLabsApiKey) || (await hasSecret("elevenlabs"));
  const hasDatabase = Boolean(body.databaseUrl) || (await hasSecret("databaseUrl"));
  const hasStorage = Boolean(body.supabaseServiceRoleKey) || (await hasSecret("supabaseServiceRole"));

  const setup = await updateSetup({
    openai: {
      planningModel: body.planningModel || "gpt-4.1",
      imageModel: body.imageModel || "gpt-image-1",
      status: { state: hasOpenAI ? "unchecked" : "missing", message: hasOpenAI ? "Saved, not checked yet." : "Missing API key." }
    },
    elevenlabs: {
      musicModel: body.musicModel || "eleven-music",
      outputFormat: body.outputFormat || "mp3_44100_128",
      status: { state: hasElevenLabs ? "unchecked" : "missing", message: hasElevenLabs ? "Saved, not checked yet." : "Missing API key." }
    },
    worker: {
      supabaseUrl: body.supabaseUrl || undefined,
      supabasePublishableKey: body.supabasePublishableKey || undefined,
      storageBucket: body.storageBucket || "velvet-assets",
      status: { state: hasStorage && body.supabaseUrl ? "unchecked" : "valid", message: hasStorage && body.supabaseUrl ? "Shared storage saved, not checked yet." : "Local storage is ready." },
      databaseStatus: {
        state: hasDatabase ? "unchecked" : "missing",
        message: hasDatabase ? "Database URL saved encrypted, not checked yet." : "Optional database URL not set."
      }
    },
    budget: {
      maxTracksPerRun: Number(body.maxTracksPerRun) || 10,
      maxRenderAttemptsPerProject: Number(body.maxRenderAttemptsPerProject) || 5
    },
    pricing: {
      openaiInputPerMillionTokens: Number(body.openaiInputPerMillionTokens) || undefined,
      openaiOutputPerMillionTokens: Number(body.openaiOutputPerMillionTokens) || undefined,
      elevenLabsPerMinute: Number(body.elevenLabsPerMinute) || undefined,
      ffmpegPerRenderMinute: Number(body.ffmpegPerRenderMinute) || undefined,
      youtubeUploadPerVideo: Number(body.youtubeUploadPerVideo) || undefined
    }
  });

  return NextResponse.json({ setup });
}
