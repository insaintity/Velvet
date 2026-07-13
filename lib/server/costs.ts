import type { SetupRecord, UsageRecord } from "./types";

type UsageInput = Omit<UsageRecord, "id" | "createdAt" | "estimatedCostUsd" | "costStatus">;

export function pricingFromEnvironment(): SetupRecord["pricing"] {
  return {
    openaiInputPerMillionTokens: readRate("VELVET_OPENAI_INPUT_PER_1M_TOKENS_USD"),
    openaiOutputPerMillionTokens: readRate("VELVET_OPENAI_OUTPUT_PER_1M_TOKENS_USD"),
    elevenLabsPerMinute: readRate("VELVET_ELEVENLABS_PER_MINUTE_USD"),
    ffmpegPerRenderMinute: readRate("VELVET_FFMPEG_PER_RENDER_MINUTE_USD"),
    youtubeUploadPerVideo: readRate("VELVET_YOUTUBE_UPLOAD_PER_VIDEO_USD")
  };
}

export function estimateUsageCost(usage: UsageInput, setup: SetupRecord) {
  const pricing = { ...pricingFromEnvironment(), ...setup.pricing };
  const estimatedCostUsd = calculateCost(usage, pricing);

  if (estimatedCostUsd === undefined) {
    return { costStatus: "rate-not-set" as const };
  }

  return {
    estimatedCostUsd: roundUsd(estimatedCostUsd),
    costStatus: "estimated" as const
  };
}

function calculateCost(usage: UsageInput, pricing: SetupRecord["pricing"]) {
  if (usage.provider === "openai") {
    const inputRate = pricing?.openaiInputPerMillionTokens;
    const outputRate = pricing?.openaiOutputPerMillionTokens;
    const inputTokens = usage.units.input_tokens ?? usage.units.inputTokens ?? 0;
    const outputTokens = usage.units.output_tokens ?? usage.units.outputTokens ?? 0;

    if (inputRate === undefined && outputRate === undefined) return undefined;
    return (inputTokens / 1_000_000) * (inputRate ?? 0) + (outputTokens / 1_000_000) * (outputRate ?? 0);
  }

  if (usage.provider === "elevenlabs") {
    if (pricing?.elevenLabsPerMinute === undefined) return undefined;
    return ((usage.units.seconds ?? 0) / 60) * pricing.elevenLabsPerMinute;
  }

  if (usage.provider === "ffmpeg") {
    if (pricing?.ffmpegPerRenderMinute === undefined) return undefined;
    return ((usage.units.seconds ?? usage.units.renderSeconds ?? 0) / 60) * pricing.ffmpegPerRenderMinute;
  }

  if (usage.provider === "youtube") {
    if (pricing?.youtubeUploadPerVideo === undefined) return undefined;
    return (usage.units.videos ?? 0) * pricing.youtubeUploadPerVideo;
  }

  return undefined;
}

function readRate(name: string) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function roundUsd(value: number) {
  return Math.round(value * 10000) / 10000;
}
