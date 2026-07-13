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
      youtube: await hasSecret("youtubeRefreshToken")
    }
  });
}

export async function POST(request: Request) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  const body = await request.json();

  await saveSecret("openai", body.openaiApiKey ?? "");
  await saveSecret("elevenlabs", body.elevenLabsApiKey ?? "");
  const hasOpenAI = Boolean(body.openaiApiKey) || (await hasSecret("openai"));
  const hasElevenLabs = Boolean(body.elevenLabsApiKey) || (await hasSecret("elevenlabs"));

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
      storageBucket: body.storageBucket || "velvet-assets",
      status: { state: "valid", message: "Local storage is ready." }
    }
  });

  return NextResponse.json({ setup });
}
