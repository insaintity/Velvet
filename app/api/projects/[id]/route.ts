import { NextResponse } from "next/server";
import { readDatabase, updateProject } from "@/lib/server/db";
import { requireSameOrigin } from "@/lib/server/security";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === id);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    project,
    prompts: database.prompts.filter((prompt) => prompt.projectId === id),
    jobs: database.jobs.filter((job) => job.projectId === id),
    uploads: database.uploads.filter((upload) => upload.projectId === id),
    usage: database.usage.filter((usage) => usage.projectId === id)
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  const { id } = await context.params;
  const body = await request.json();
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === id);

  if (!project?.blueprint) {
    return NextResponse.json({ error: "Project blueprint is required before editing." }, { status: 404 });
  }

  const updated = await updateProject(id, {
    title: body.title || project.title,
    blueprint: {
      ...project.blueprint,
      title: body.title || project.blueprint.title,
      concept: body.concept ?? project.blueprint.concept,
      coverPrompt: body.coverPrompt ?? project.blueprint.coverPrompt,
      videoPrompt: body.videoPrompt ?? project.blueprint.videoPrompt,
      youtube: {
        ...project.blueprint.youtube,
        title: body.youtubeTitle ?? project.blueprint.youtube.title,
        description: body.youtubeDescription ?? project.blueprint.youtube.description,
        tags:
          typeof body.youtubeTags === "string"
            ? body.youtubeTags
                .split(",")
                .map((tag: string) => tag.trim())
                .filter(Boolean)
            : project.blueprint.youtube.tags
      }
    }
  });

  return NextResponse.json({ project: updated });
}
