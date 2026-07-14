import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { updateSetup } from "@/lib/server/db";
import { exchangeYouTubeCode, fetchYouTubeChannel } from "@/lib/server/providers/youtube";
import { deleteSecret, readSecret, saveSecret } from "@/lib/server/secrets";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("youtube_oauth_state")?.value || (await readSecret("youtubeOAuthState"));

  cookieStore.delete("youtube_oauth_state");
  await deleteSecret("youtubeOAuthState");

  if (error) {
    return NextResponse.redirect(new URL(`/settings?youtube=denied&reason=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?youtube=invalid_state", request.url));
  }

  try {
    const redirectUri = new URL("/api/youtube/callback", request.url).toString();
    const token = await exchangeYouTubeCode(code, redirectUri);
    if (token.refresh_token) {
      await saveSecret("youtubeRefreshToken", token.refresh_token);
    }

    const channel = await fetchYouTubeChannel(token.access_token);
    await updateSetup({
      youtube: {
        channelId: channel.channelId,
        channelTitle: channel.channelTitle,
        status: {
          state: "connected",
          message: channel.channelTitle ? `Connected to ${channel.channelTitle}.` : "YouTube connected.",
          checkedAt: new Date().toISOString()
        }
      }
    });

    return NextResponse.redirect(new URL("/settings?youtube=connected", request.url));
  } catch {
    return NextResponse.redirect(new URL("/settings?youtube=token_exchange_failed", request.url));
  }
}
