import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getYouTubeOAuthConfig } from "@/lib/server/providers/youtube";
import { saveSecret } from "@/lib/server/secrets";

const youtubeScopes = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly"
];

export async function GET(request: Request) {
  const fallbackRedirectUri = new URL("/api/youtube/callback", request.url).toString();
  let config;
  try {
    config = await getYouTubeOAuthConfig(fallbackRedirectUri);
  } catch {
    return NextResponse.redirect(new URL("/settings?youtube=missing_config", request.url));
  }

  const state = randomBytes(24).toString("hex");
  await saveSecret("youtubeOAuthState", state);
  const cookieStore = await cookies();
  cookieStore.set("youtube_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 10 * 60
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: youtubeScopes.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
