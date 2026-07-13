import type { AlbumBlueprint } from "../types";

const openaiBaseUrl = "https://api.openai.com/v1";

export async function validateOpenAIKey(apiKey: string) {
  const response = await fetch(`${openaiBaseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  if (!response.ok) {
    return { valid: false, message: `OpenAI rejected the key (${response.status}).` };
  }

  return { valid: true, message: "OpenAI key is valid." };
}

export async function generateAlbumBlueprint({
  apiKey,
  model,
  brief
}: {
  apiKey: string;
  model: string;
  brief: string;
}): Promise<{ blueprint: AlbumBlueprint; raw: string; usage?: Record<string, number> }> {
  const response = await fetch(`${openaiBaseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You are Velvet, an expert AI music director. Create concise, commercially useful jazz album blueprints. Return only valid JSON."
        },
        {
          role: "user",
          content: `Create a 6-track AI jazz album blueprint from this brief:\n\n${brief}`
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "album_blueprint",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["title", "concept", "targetLengthMinutes", "tracks", "coverPrompt", "videoPrompt", "youtube"],
            properties: {
              title: { type: "string" },
              concept: { type: "string" },
              targetLengthMinutes: { type: "number" },
              tracks: {
                type: "array",
                minItems: 4,
                maxItems: 10,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title", "durationSeconds", "prompt", "mood"],
                  properties: {
                    title: { type: "string" },
                    durationSeconds: { type: "number" },
                    prompt: { type: "string" },
                    mood: { type: "string" }
                  }
                }
              },
              coverPrompt: { type: "string" },
              videoPrompt: { type: "string" },
              youtube: {
                type: "object",
                additionalProperties: false,
                required: ["title", "description", "tags"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  tags: { type: "array", items: { type: "string" } }
                }
              }
            }
          },
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI blueprint generation failed (${response.status}).`);
  }

  const data = await response.json();
  const raw = data.output_text ?? data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? []).map((item: { text?: string }) => item.text ?? "").join("");
  return { blueprint: JSON.parse(raw), raw, usage: data.usage };
}
