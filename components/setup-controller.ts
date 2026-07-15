"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type ClientStatus = { state?: string; message?: string; checkedAt?: string };
export type SetupProvider = "openai" | "elevenlabs" | "database" | "storage";
export type SetupData = {
  setup?: {
    openai?: { planningModel?: string; imageModel?: string; status?: ClientStatus };
    elevenlabs?: { musicModel?: string; outputFormat?: string; status?: ClientStatus };
    youtube?: { channelTitle?: string; channelId?: string; status?: ClientStatus };
    worker?: { storageEndpoint?: string; storageRegion?: string; storageBucket?: string; status?: ClientStatus; databaseStatus?: ClientStatus };
    budget?: { maxTracksPerRun?: number; maxRenderAttemptsPerProject?: number };
    pricing?: Record<string, number | undefined>;
  };
  secrets?: Record<string, boolean>;
  secretHints?: Record<string, string | undefined>;
  validation?: Partial<Record<SetupProvider, ClientStatus>>;
};

export type SetupOverview = {
  loaded: boolean;
  readyCount: number;
  isComplete: boolean;
  canCreate: boolean;
  canGenerate: boolean;
  canPublish: boolean;
  services: Array<{ label: string; ready: boolean }>;
};

type SetupSnapshot = { loaded: boolean; data: SetupData; error?: string };
const emptySnapshot: SetupSnapshot = { loaded: false, data: {} };
let snapshot = emptySnapshot;
let request: Promise<SetupData> | undefined;
const listeners = new Set<() => void>();

function emit(next: SetupSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("velvet:setup-cache", { detail: next.data }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export async function refreshSetup(force = false) {
  if (!force && request) return request;
  request = fetch("/api/setup", { cache: "no-store" })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Setup is unavailable.");
      emit({ loaded: true, data });
      return data as SetupData;
    })
    .catch((error) => {
      emit({ loaded: true, data: snapshot.data, error: error instanceof Error ? error.message : "Setup is unavailable." });
      throw error;
    })
    .finally(() => { request = undefined; });
  return request;
}

export async function saveAndValidateSetup(payload: Record<string, unknown>, providers: SetupProvider[]) {
  const response = await fetch("/api/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, validateProviders: providers })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Setup could not be saved.");
  emit({ loaded: true, data });
  return data as SetupData;
}

export async function configureYouTubeOAuth(clientId: string, clientSecret = "") {
  const response = await fetch("/api/setup/youtube-oauth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret })
  });
  const data = await response.json();
  if (!response.ok || !data.configured) throw new Error(data.error ?? "Google sign-in could not be configured.");
  await refreshSetup(true);
  return data as { configured: true };
}

export async function waitForYouTubeConnection(timeoutMs = 180_000, signal?: AbortSignal) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException("YouTube connection cancelled.", "AbortError");
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, 1_000);
      signal?.addEventListener("abort", () => {
        window.clearTimeout(timer);
        reject(new DOMException("YouTube connection cancelled.", "AbortError"));
      }, { once: true });
    });
    const data = await refreshSetup(true).catch(() => undefined);
    if (data?.setup?.youtube?.status?.state === "connected") return data;
  }
  throw new Error("YouTube sign-in was not completed. Try again when the Google window is ready.");
}

export function setupOverview(data: SetupData, loaded = true): SetupOverview {
  const openai = Boolean(data.secrets?.openai && data.setup?.openai?.status?.state === "valid");
  const elevenlabs = Boolean(data.secrets?.elevenlabs && data.setup?.elevenlabs?.status?.state === "valid");
  const youtube = Boolean(data.secrets?.youtube && data.setup?.youtube?.status?.state === "connected");
  const services = [
    { label: "ChatGPT", ready: openai },
    { label: "ElevenLabs", ready: elevenlabs },
    { label: "YouTube", ready: youtube }
  ];
  return {
    loaded,
    services,
    readyCount: services.filter((service) => service.ready).length,
    isComplete: services.every((service) => service.ready),
    canCreate: openai,
    canGenerate: elevenlabs,
    canPublish: youtube
  };
}

export function useSetupController() {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => emptySnapshot);
  useEffect(() => { if (!current.loaded) refreshSetup().catch(() => undefined); }, [current.loaded]);
  const refresh = useCallback(() => refreshSetup(true), []);
  return { ...current, overview: setupOverview(current.data, current.loaded), refresh, saveAndValidate: saveAndValidateSetup };
}

export function useSetupOverview() {
  return useSetupController().overview;
}
