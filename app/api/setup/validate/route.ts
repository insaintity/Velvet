import { NextResponse } from "next/server";
import { updateSetup } from "@/lib/server/db";
import { validateElevenLabsKey } from "@/lib/server/providers/elevenlabs";
import { validateOpenAIKey } from "@/lib/server/providers/openai";
import { requireSameOrigin } from "@/lib/server/security";
import { readSecret } from "@/lib/server/secrets";

export async function POST(request: Request) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  const { provider } = await request.json();
  const now = new Date().toISOString();

  if (provider === "openai") {
    const key = await readSecret("openai");
    if (!key) {
      const setup = await updateSetup({ openai: { planningModel: "gpt-4.1", imageModel: "gpt-image-1", status: { state: "missing", message: "Add an OpenAI key first.", checkedAt: now } } });
      return NextResponse.json({ status: setup.openai?.status }, { status: 400 });
    }

    const result = await validateOpenAIKey(key);
    const setup = await updateSetup({
      openai: {
        planningModel: "gpt-4.1",
        imageModel: "gpt-image-1",
        status: { state: result.valid ? "valid" : "invalid", message: result.message, checkedAt: now }
      }
    });
    return NextResponse.json({ status: setup.openai?.status }, { status: result.valid ? 200 : 401 });
  }

  if (provider === "elevenlabs") {
    const key = await readSecret("elevenlabs");
    if (!key) {
      const setup = await updateSetup({ elevenlabs: { musicModel: "eleven-music", outputFormat: "mp3_44100_128", status: { state: "missing", message: "Add an ElevenLabs key first.", checkedAt: now } } });
      return NextResponse.json({ status: setup.elevenlabs?.status }, { status: 400 });
    }

    const result = await validateElevenLabsKey(key);
    const setup = await updateSetup({
      elevenlabs: {
        musicModel: "eleven-music",
        outputFormat: "mp3_44100_128",
        status: { state: result.valid ? "valid" : "invalid", message: result.message, checkedAt: now }
      }
    });
    return NextResponse.json({ status: setup.elevenlabs?.status }, { status: result.valid ? 200 : 401 });
  }

  return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
}
