import { readSecret } from "../secrets";

const youtubeUploadUrl = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

export async function getYouTubeOAuthConfig(fallbackRedirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || (await readSecret("googleClientId"));
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || (await readSecret("googleClientSecret"));
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || fallbackRedirectUri;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("YouTube OAuth is not configured.");
  }

  return { clientId, clientSecret, redirectUri };
}

export async function exchangeYouTubeCode(code: string, fallbackRedirectUri?: string) {
  const { clientId, clientSecret, redirectUri } = await getYouTubeOAuthConfig(fallbackRedirectUri);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!response.ok) {
    throw new Error(`YouTube token exchange failed (${response.status}).`);
  }

  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>;
}

export async function refreshYouTubeAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || (await readSecret("googleClientId"));
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || (await readSecret("googleClientSecret"));

  if (!clientId || !clientSecret) throw new Error("YouTube OAuth is not configured.");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error(`YouTube token refresh failed (${response.status}).`);
  }

  return response.json() as Promise<{ access_token: string; expires_in: number }>;
}

export async function fetchYouTubeChannel(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`YouTube channel lookup failed (${response.status}).`);
  }

  const data = await response.json();
  const channel = data.items?.[0];
  return {
    channelId: channel?.id as string | undefined,
    channelTitle: channel?.snippet?.title as string | undefined
  };
}

export async function uploadYouTubeVideo({
  accessToken,
  video,
  title,
  description,
  tags,
  privacy
}: {
  accessToken: string;
  video: Buffer;
  title: string;
  description: string;
  tags: string[];
  privacy: "private" | "unlisted" | "public";
}) {
  const session = await fetch(youtubeUploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(video.byteLength)
    },
    body: JSON.stringify({
      snippet: { title, description, tags },
      status: { privacyStatus: privacy }
    })
  });

  const uploadLocation = session.headers.get("location");
  if (!session.ok || !uploadLocation) {
    throw new Error(`YouTube upload session failed (${session.status}).`);
  }

  const upload = await fetch(uploadLocation, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(video.byteLength)
    },
    body: new Blob([new Uint8Array(video)], { type: "video/mp4" })
  });

  if (!upload.ok) {
    throw new Error(`YouTube video upload failed (${upload.status}).`);
  }

  return upload.json() as Promise<{ id: string }>;
}
