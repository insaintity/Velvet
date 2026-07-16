import { NextResponse } from "next/server";
import { addJob, readDatabase, updateJob, updateProject } from "@/lib/server/db";
import { requireSameOrigin } from "@/lib/server/security";
import { hasSecret } from "@/lib/server/secrets";
import type { JobRecord } from "@/lib/server/types";

export async function GET() {
  const database = await readDatabase();
  return NextResponse.json({ jobs: database.jobs });
}

export async function PATCH(request: Request) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;
  const { jobId, action } = await request.json();
  const database = await readDatabase();
  const job = database.jobs.find((item) => item.id === jobId);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (action === "retry" && ["failed", "blocked"].includes(job.status)) {
    const updated = await updateJob(job.id, { status: "queued", error: undefined, message: `${jobLabel(job.type)} queued again.` });
    return NextResponse.json({ job: updated });
  }
  if (action === "cancel" && job.status === "queued") {
    const updated = await updateJob(job.id, { status: "blocked", message: `${jobLabel(job.type)} cancelled.` });
    return NextResponse.json({ job: updated });
  }
  return NextResponse.json({ error: `This ${job.status} job cannot be ${action === "retry" ? "retried" : "cancelled"}.` }, { status: 409 });
}

export async function POST(request: Request) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  const body = await request.json();
  const type = readJobType(body.type);
  const projectId = typeof body.projectId === "string" ? body.projectId : undefined;

  if (!type || !projectId) {
    return NextResponse.json({ error: "A valid job type and project ID are required." }, { status: 400 });
  }

  const database = await readDatabase();
  if (type === "music" && database.setup.elevenlabs?.status.state !== "valid") {
    return NextResponse.json({ error: "Connect and verify ElevenLabs before generating music." }, { status: 409 });
  }
  if (type === "youtube-upload" && (database.setup.youtube?.status.state !== "connected" || !(await hasSecret("youtubeRefreshToken")))) {
    return NextResponse.json({ error: "Log in with YouTube before uploading." }, { status: 409 });
  }
  const existingJob = database.jobs.find((job) => job.projectId === projectId && job.type === type && ["queued", "running"].includes(job.status));
  if (existingJob) {
    await updateProject(projectId, { status: projectStatusForQueuedJob(type) });
    return NextResponse.json({ job: existingJob, message: `${jobLabel(type)} is already ${existingJob.status}.` }, { status: 202 });
  }

  const job = await addJob({
    type,
    projectId,
    status: "queued",
    message: `${jobLabel(type)} queued for the worker.`,
    payload: typeof body.payload === "object" && body.payload ? body.payload : {}
  });
  await updateProject(projectId, { status: projectStatusForQueuedJob(type) });

  return NextResponse.json({ job, message: `${jobLabel(type)} queued. Start the Velvet worker to process it.` }, { status: 202 });
}

function readJobType(value: unknown): JobRecord["type"] | undefined {
  return value === "music" || value === "render" || value === "youtube-upload" ? value : undefined;
}

function jobLabel(type: JobRecord["type"]) {
  return {
    blueprint: "Blueprint generation",
    music: "Music generation",
    render: "Render",
    "youtube-upload": "YouTube upload"
  }[type];
}

function projectStatusForQueuedJob(type: JobRecord["type"]) {
  return {
    blueprint: "blueprint",
    music: "generating",
    render: "rendering",
    "youtube-upload": "uploading"
  }[type] as "blueprint" | "generating" | "rendering" | "uploading";
}
