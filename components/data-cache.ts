"use client";

type CacheEntry = { value?: unknown; fetchedAt?: number; request?: Promise<unknown> };
const cache = new Map<string, CacheEntry>();
let eventsStarted = false;
let studioEvents: EventSource | undefined;

export function peekCachedJson<T>(key: string): T | undefined {
  return cache.get(key)?.value as T | undefined;
}

export async function cachedJson<T>(key: string, force = false): Promise<T> {
  const current = cache.get(key) ?? {};
  if (!force && current.value !== undefined) return current.value as T;
  if (!force && current.request) return current.request as Promise<T>;

  const request = fetch(key, { cache: "no-store" }).then(async (response) => {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? `${key} could not be loaded.`);
    cache.set(key, { value: body, fetchedAt: Date.now() });
    return body as T;
  }).finally(() => {
    const latest = cache.get(key);
    if (latest?.request) cache.set(key, { ...latest, request: undefined });
  });
  cache.set(key, { ...current, request });
  return request;
}

export function invalidateCachedJson(prefix?: string) {
  for (const key of cache.keys()) {
    if (!prefix || key.startsWith(prefix)) cache.delete(key);
  }
}

export function startStudioEvents() {
  if (eventsStarted || typeof window === "undefined") return;
  eventsStarted = true;
  const connect = () => {
    if (document.hidden || studioEvents) return;
    const events = new EventSource("/api/events");
    studioEvents = events;
    events.addEventListener("studio-update", refreshStudioData);
    events.onerror = () => {
      // EventSource reconnects automatically using the server-provided retry interval.
    };
  };
  const visibilityChanged = () => {
    if (document.hidden) {
      studioEvents?.close();
      studioEvents = undefined;
      return;
    }
    connect();
  };
  document.addEventListener("visibilitychange", visibilityChanged);
  connect();
}

function refreshStudioData() {
    invalidateCachedJson("/api/projects");
    invalidateCachedJson("/api/jobs");
    invalidateCachedJson("/api/uploads");
    invalidateCachedJson("/api/prompts");
    invalidateCachedJson("/api/publishing");
    invalidateCachedJson("/api/analytics");
    window.dispatchEvent(new Event("velvet:studio-update"));
}
