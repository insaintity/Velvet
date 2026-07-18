export type ProviderName = "openai" | "elevenlabs" | "youtube";

export type ProviderStatus = {
  state: "missing" | "unchecked" | "valid" | "invalid" | "connected";
  message?: string;
  checkedAt?: string;
};

export type SetupRecord = {
  auth?: {
    username: string;
    email: string;
    passwordHash: string;
    passwordSalt: string;
    createdAt: string;
    updatedAt: string;
  };
  openai?: {
    planningModel: string;
    imageModel: string;
    status: ProviderStatus;
  };
  elevenlabs?: {
    musicModel: string;
    outputFormat: string;
    status: ProviderStatus;
  };
  youtube?: {
    channelTitle?: string;
    channelId?: string;
    status: ProviderStatus;
  };
  worker?: {
    storageEndpoint?: string;
    storageRegion?: string;
    storageForcePathStyle?: boolean;
    storageBucket: string;
    status: ProviderStatus;
    databaseStatus?: ProviderStatus;
  };
  budget?: {
    maxTracksPerRun: number;
    maxRenderAttemptsPerProject: number;
  };
  pricing?: {
    openaiInputPerMillionTokens?: number;
    openaiOutputPerMillionTokens?: number;
    elevenLabsPerMinute?: number;
    ffmpegPerRenderMinute?: number;
    youtubeUploadPerVideo?: number;
  };
  updatedAt?: string;
};

export type AlbumBlueprint = {
  title: string;
  concept: string;
  targetLengthMinutes: number;
  tracks: Array<{
    title: string;
    durationSeconds: number;
    prompt: string;
    mood: string;
  }>;
  coverPrompt: string;
  videoPrompt: string;
  youtube: {
    title: string;
    description: string;
    tags: string[];
  };
};

export type MediaType = "song" | "album";

export type GeneratedTrack = {
  id?: string;
  title: string;
  filePath: string;
  storagePath?: string;
  durationSeconds: number;
  version?: number;
  prompt?: string;
  createdAt?: string;
  approvedAt?: string;
};

export type ProductionSettings = {
  gapSeconds: number;
  fadeSeconds: number;
  targetLufs: number;
  stylePreset?: string;
  scheduledPublishAt?: string;
  artworkAssetId?: string;
  visualPreset?: "clean" | "velvet" | "rose-film" | "midnight" | "noir" | "mono";
  filterIntensity?: number;
  overlayOpacity?: number;
  grain?: number;
  flicker?: number;
  vignette?: number;
  dust?: number;
  exportSize?: "1080p" | "720p" | "shorts" | "square";
  exportFormat?: "mp4" | "webm";
  exportQuality?: "draft" | "standard" | "high";
};

export type ProjectRecord = {
  id: string;
  title: string;
  brief: string;
  mediaType?: MediaType;
  status: "blueprint" | "approved" | "generating" | "generated" | "rendering" | "rendered" | "uploading" | "uploaded" | "failed";
  blueprint?: AlbumBlueprint;
  approvedAt?: string;
  generatedTracks?: GeneratedTrack[];
  trackVersions?: Record<string, GeneratedTrack[]>;
  production?: ProductionSettings;
  referenceAssets?: Array<{
    id: string;
    name: string;
    kind: "audio" | "artwork";
    filePath: string;
    storagePath?: string;
    createdAt: string;
  }>;
  creativeVariants?: {
    titles: string[];
    thumbnailPrompts: string[];
    createdAt: string;
  };
  render?: {
    manifestPath: string;
    manifestStoragePath?: string;
    videoPath?: string;
    videoStoragePath?: string;
    status: "blocked" | "rendered";
    message: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type PromptRecord = {
  id: string;
  projectId: string;
  kind: string;
  prompt: string;
  response?: string;
  version: number;
  createdAt: string;
};

export type JobRecord = {
  id: string;
  type: "blueprint" | "music" | "render" | "youtube-upload";
  projectId?: string;
  status: "queued" | "running" | "completed" | "failed" | "blocked";
  message: string;
  payload?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type UploadRecord = {
  id: string;
  projectId: string;
  projectTitle?: string;
  videoId?: string;
  url?: string;
  videoPath?: string;
  videoStoragePath?: string;
  manifestPath?: string;
  manifestStoragePath?: string;
  idempotencyKey?: string;
  prompts?: Array<{
    kind: string;
    prompt: string;
    response?: string;
    version: number;
  }>;
  usage?: UsageRecord[];
  privacy: "private" | "unlisted" | "public";
  status: "uploaded" | "failed";
  createdAt: string;
};

export type UsageRecord = {
  id: string;
  provider: "openai" | "elevenlabs" | "youtube" | "ffmpeg";
  projectId?: string;
  operation: string;
  units: Record<string, number>;
  estimatedCostUsd?: number;
  costStatus?: "estimated" | "rate-not-set";
  createdAt: string;
};

export type VelvetDatabase = {
  setup: SetupRecord;
  projects: ProjectRecord[];
  prompts: PromptRecord[];
  jobs: JobRecord[];
  uploads: UploadRecord[];
  usage: UsageRecord[];
};
