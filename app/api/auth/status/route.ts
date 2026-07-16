import { NextResponse } from "next/server";
import { authIsConfigured } from "@/lib/auth";
import { hasStoredOwnerAccount } from "@/lib/server/auth-accounts";

export async function GET() {
  return NextResponse.json({ enabled: authIsConfigured(), signupAvailable: !(await hasStoredOwnerAccount()) });
}
