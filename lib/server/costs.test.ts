import { describe, expect, it } from "vitest";
import { estimateUsageCost } from "./costs";

describe("usage cost estimates", () => {
  it("estimates OpenAI token costs from configured rates", () => {
    const cost = estimateUsageCost(
      {
        provider: "openai",
        operation: "album-blueprint",
        units: { input_tokens: 1000, output_tokens: 2000 }
      },
      {
        pricing: {
          openaiInputPerMillionTokens: 2,
          openaiOutputPerMillionTokens: 8
        }
      }
    );

    expect(cost).toEqual({ costStatus: "estimated", estimatedCostUsd: 0.018 });
  });

  it("marks usage when a rate has not been configured", () => {
    const cost = estimateUsageCost(
      {
        provider: "elevenlabs",
        operation: "music-generation",
        units: { seconds: 120 }
      },
      {}
    );

    expect(cost).toEqual({ costStatus: "rate-not-set" });
  });
});
