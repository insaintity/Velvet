import { afterEach, describe, expect, it, vi } from "vitest";
import { getYouTubeOAuthConfig } from "./youtube";

describe("YouTube OAuth configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the current app callback when no redirect environment variable is set", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "desktop-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "desktop-client-secret");
    vi.stubEnv("YOUTUBE_REDIRECT_URI", "");

    await expect(getYouTubeOAuthConfig("http://127.0.0.1:43123/api/youtube/callback")).resolves.toEqual({
      clientId: "desktop-client-id",
      clientSecret: "desktop-client-secret",
      redirectUri: "http://127.0.0.1:43123/api/youtube/callback"
    });
  });

  it("keeps an explicitly configured production redirect URI", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "web-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "web-client-secret");
    vi.stubEnv("YOUTUBE_REDIRECT_URI", "https://velvet.example/api/youtube/callback");

    await expect(getYouTubeOAuthConfig("http://127.0.0.1:3000/api/youtube/callback")).resolves.toMatchObject({
      redirectUri: "https://velvet.example/api/youtube/callback"
    });
  });
});
