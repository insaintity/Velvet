import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/server/db";
import { requireSameOrigin } from "@/lib/server/security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  const { id } = await context.params;
  const project = await getProject(id);

  if (!project?.blueprint) {
    return NextResponse.json({ error: "Blueprint required before approval." }, { status: 404 });
  }

  const updated = await updateProject(id, {
    status: "approved",
    approvedAt: new Date().toISOString()
  });

  return NextResponse.json({ project: updated });
}
