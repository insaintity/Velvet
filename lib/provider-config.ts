import { z } from "zod";

export const onboardingConfigSchema = z.object({
  openai: z.object({
    apiKeyEnvVar: z.string().min(1).default("OPENAI_API_KEY"),
    planningModel: z.string().min(1),
    imageModel: z.string().min(1)
  }),
  elevenLabs: z.object({
    apiKeyEnvVar: z.string().min(1).default("ELEVENLABS_API_KEY"),
    musicModel: z.string().min(1),
    defaultOutputFormat: z.string().min(1)
  }),
  youtube: z.object({
    clientIdEnvVar: z.string().min(1).default("GOOGLE_CLIENT_ID"),
    clientSecretEnvVar: z.string().min(1).default("GOOGLE_CLIENT_SECRET"),
    redirectUriEnvVar: z.string().min(1).default("YOUTUBE_REDIRECT_URI"),
    defaultPrivacy: z.enum(["private", "unlisted", "public", "scheduled"]).default("private")
  }),
  worker: z.object({
    storageBucket: z.string().min(1),
    workerSecretEnvVar: z.string().min(1).default("WORKER_SECRET")
  })
});

export type OnboardingConfig = z.infer<typeof onboardingConfigSchema>;

export const defaultOnboardingConfig: OnboardingConfig = {
  openai: {
    apiKeyEnvVar: "OPENAI_API_KEY",
    planningModel: "gpt-4.1",
    imageModel: "gpt-image-1"
  },
  elevenLabs: {
    apiKeyEnvVar: "ELEVENLABS_API_KEY",
    musicModel: "eleven-music",
    defaultOutputFormat: "mp3_44100_128"
  },
  youtube: {
    clientIdEnvVar: "GOOGLE_CLIENT_ID",
    clientSecretEnvVar: "GOOGLE_CLIENT_SECRET",
    redirectUriEnvVar: "YOUTUBE_REDIRECT_URI",
    defaultPrivacy: "private"
  },
  worker: {
    storageBucket: "velvet-coda-assets",
    workerSecretEnvVar: "WORKER_SECRET"
  }
};
