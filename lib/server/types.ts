export type ProviderName = "openai" | "elevenlabs" | "youtube";

export type ProviderStatus = {
  state: "missing" | "unchecked" | "valid" | "invalid" | "connected";
  message?: string;
  checkedAt?: string;
};

export type SetupRecord = {
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
    storageBucket: string;
    status: ProviderStatus;
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

export type ProjectRecord = {
  id: string;
  title: string;
  brief: string;
  status: "blueprint" | "approved" | "generating" | "rendered" | "uploaded" | "failed";
  blueprint?: AlbumBlueprint;
  approvedAt?: string;
  generatedTracks?: Array<{
    title: string;
    filePath: string;
    durationSeconds: number;
  }>;
  render?: {
    manifestPath: string;
    videoPath?: string;
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
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type UploadRecord = {
  id: string;
  projectId: string;
  videoId?: string;
  url?: string;
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
