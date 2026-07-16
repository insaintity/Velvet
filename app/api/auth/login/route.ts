import { NextResponse } from "next/server";
import { authIsConfigured, createSessionToken, sessionCookieOptions, velvetAccountMatches, VELVET_SESSION_COOKIE } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/server/security";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;
  if (!authIsConfigured()) return NextResponse.json({ error: "Private studio access has not been configured." }, { status: 503 });

  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = attempts.get(address);
  if (limit && limit.resetAt > Date.now() && limit.count >= 8) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.username !== "string" || typeof body.email !== "string" || typeof body.password !== "string" || !(await velvetAccountMatches(body.username, body.email, body.password))) {
    attempts.set(address, { count: limit?.resetAt && limit.resetAt > Date.now() ? limit.count + 1 : 1, resetAt: Date.now() + 15 * 60_000 });
    return NextResponse.json({ error: "That Velvet account is not correct." }, { status: 401 });
  }

  attempts.delete(address);
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(VELVET_SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  return response;
}
