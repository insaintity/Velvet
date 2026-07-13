import { describe, expect, it } from "vitest";
import { defaultOnboardingConfig, onboardingConfigSchema } from "./provider-config";

describe("onboarding config schema", () => {
  it("accepts the default ChatGPT, ElevenLabs, YouTube and worker setup", () => {
    expect(onboardingConfigSchema.safeParse(defaultOnboardingConfig).success).toBe(true);
  });

  it("rejects missing required model configuration", () => {
    expect(
      onboardingConfigSchema.safeParse({
        ...defaultOnboardingConfig,
        openai: {
          apiKeyEnvVar: "OPENAI_API_KEY",
          imageModel: "gpt-image-1"
        }
      }).success
    ).toBe(false);
  });
});
