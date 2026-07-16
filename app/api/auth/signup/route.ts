import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions, VELVET_SESSION_COOKIE } from "@/lib/auth";
import { createStoredOwnerAccount, validateAccountInput } from "@/lib/server/auth-accounts";
import { requireSameOrigin } from "@/lib/server/security";

export async function POST(request: Request) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const input = validateAccountInput(body.username, body.email, body.password);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });

  try {
    await createStoredOwnerAccount(input.username, input.email, input.password);
    const response = NextResponse.json({ authenticated: true, created: true });
    response.cookies.set(VELVET_SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Velvet account could not be created." }, { status: 409 });
  }
}
