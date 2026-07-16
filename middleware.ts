import { NextResponse, type NextRequest } from "next/server";
import { authIsConfigured, authIsRequired, VELVET_SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/manifest.webmanifest", "/api/auth/login", "/api/auth/signup", "/api/health"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (!authIsRequired()) return NextResponse.next();

  if (!authIsConfigured()) {
    return pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Private studio access is not configured." }, { status: 503 })
      : redirectToLogin(request, "configuration");
  }

  if (await verifySessionToken(request.cookies.get(VELVET_SESSION_COOKIE)?.value)) return NextResponse.next();
  return pathname.startsWith("/api/")
    ? NextResponse.json({ error: "Private studio login required." }, { status: 401 })
    : redirectToLogin(request);
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const login = new URL("/login", request.url);
  if (!["/", "/projects/new", "/dashboard"].includes(request.nextUrl.pathname)) login.searchParams.set("returnTo", request.nextUrl.pathname);
  if (reason) login.searchParams.set("reason", reason);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.png|brand/).*)"]
};
