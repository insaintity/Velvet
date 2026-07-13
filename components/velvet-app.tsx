"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Circle,
  Database,
  FileText,
  HelpCircle,
  History,
  KeyRound,
  Lock,
  Music2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Volume2,
  Youtube
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { historyColumns, historyPromptTypes, navItems, safetyDefaults, setupSteps } from "@/lib/app-data";
import { formatDuration } from "@/lib/time";
import { usePlayerStore } from "@/store/player-store";

export function VelvetApp() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <main className="relative z-10 h-screen min-w-[1120px] overflow-hidden p-5 text-[15px]">
      <div className="grid h-[calc(100vh-104px)] grid-cols-[240px_1fr] gap-5">
        <Sidebar pathname={pathname} />
        <section className="panel flex min-h-0 flex-col overflow-hidden rounded-[22px]">
          <TopBar pageTitle={pageTitle} />
          {pathname === "/projects/new" ? <NewProjectFlow /> : <FreshWorkspace pathname={pathname} />}
        </section>
      </div>
      <BottomPlayer />
    </main>
  );
}

const setupStatusItems = [
  { label: "ChatGPT", state: "Not checked" },
  { label: "ElevenLabs", state: "Not checked" },
  { label: "YouTube", state: "Not connected" }
];

type SetupForm = {
  openaiApiKey: string;
  elevenLabsApiKey: string;
  planningModel: string;
  imageModel: string;
  musicModel: string;
  outputFormat: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  databaseUrl: string;
  storageBucket: string;
  workerSecret: string;
  maxTracksPerRun: string;
  maxRenderAttemptsPerProject: string;
  openaiInputPerMillionTokens: string;
  openaiOutputPerMillionTokens: string;
  elevenLabsPerMinute: string;
  ffmpegPerRenderMinute: string;
  youtubeUploadPerVideo: string;
};

type ClientStatus = {
  state?: string;
  message?: string;
};

type ClientProject = {
  id: string;
  title: string;
  brief: string;
  status: string;
  createdAt: string;
  blueprint?: {
    concept: string;
    coverPrompt: string;
    videoPrompt: string;
    tracks: Array<{
      title: string;
      durationSeconds: number;
      prompt: string;
      mood: string;
    }>;
    youtube: {
      title: string;
      description: string;
      tags: string[];
    };
  };
  generatedTracks?: Array<{ title: string; filePath: string; durationSeconds: number }>;
  render?: {
    manifestPath: string;
    videoPath?: string;
    status: string;
    message: string;
  };
};

type ClientPrompt = {
  id: string;
  kind: string;
  prompt: string;
  version: number;
};

type ClientJob = {
  id: string;
  type: string;
  status: string;
  message: string;
};

type ClientUsage = {
  id: string;
  provider: string;
  operation: string;
  units: Record<string, number>;
  estimatedCostUsd?: number;
  costStatus?: string;
};

type ClientUpload = {
  id: string;
  projectId: string;
  projectTitle?: string;
  url?: string;
  privacy: string;
  status: string;
  createdAt: string;
  prompts?: Array<{ kind: string; version: number }>;
};

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="panel flex min-h-0 flex-col rounded-[22px] px-4 py-6">
      <div className="px-3">
        <Link href="/dashboard" className="block">
          <div className="font-serif text-[42px] lowercase leading-none tracking-[0.03em] text-[#f7eef5]">
            velvet
          </div>
          <div className="mt-2 text-[13px] font-medium tracking-[0.16em] text-[var(--rose-soft)]">
            AI music foundry
          </div>
        </Link>
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-11 items-center gap-3 rounded-lg border px-4 text-sm transition ${
                isActive
                  ? "border-[var(--border-active)] bg-[rgba(239,99,152,0.13)] text-white shadow-[inset_0_0_18px_rgba(239,99,152,0.12)]"
                  : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-white/[0.035] hover:text-white"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${isActive ? "text-[var(--rose-soft)]" : "text-[#a9a3bd]"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--border)] bg-white/[0.035] p-3">
          <div className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-[var(--text-muted)]">SETUP</div>
          {setupStatusItems.map((service) => (
            <div key={service.label} className="mb-2 flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)] last:mb-0">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
                {service.label}
              </span>
              <span className="rounded-full border border-[var(--border)] bg-black/10 px-2 py-0.5 text-[var(--text-muted)]">{service.state}</span>
            </div>
          ))}
        </div>
        <Link
          href="/settings"
          className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-white"
        >
          <Settings2 className="h-[17px] w-[17px]" />
          Settings
        </Link>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white/[0.035] p-3">
          <div className="grid h-10 w-10 place-items-center rounded-full border border-[rgba(239,99,152,0.38)] bg-[rgba(239,99,152,0.1)]">
            <Circle className="h-4 w-4 text-[var(--rose-soft)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">New Studio</div>
            <div className="text-xs text-[var(--text-muted)]">No albums yet</div>
          </div>
          <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>
      </div>
    </aside>
  );
}

function TopBar({ pageTitle }: { pageTitle: string }) {
  return (
    <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-[var(--border)] bg-black/10 px-6">
      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <Link href="/dashboard" className="hover:text-white">
          Studio
        </Link>
        <span>/</span>
        <span className="text-[var(--text-primary)]">{pageTitle}</span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/settings" className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.05] px-4 text-sm">
          <KeyRound className="h-4 w-4" />
          Setup
        </Link>
        <button aria-label="More studio actions" className="grid h-9 w-10 place-items-center rounded-lg border border-[var(--border)] bg-white/[0.05]">
          <MoreHorizontal className="h-5 w-5" />
        </button>
        <Link
          href="/settings"
          title="Complete setup before creating an album."
          className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.04] px-4 text-sm text-[var(--text-muted)]"
        >
          <Lock className="h-4 w-4" />
          Album Locked
        </Link>
      </div>
    </header>
  );
}

function FreshWorkspace({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/settings")) {
    return <SettingsWorkspace />;
  }

  if (pathname.startsWith("/projects/") && pathname !== "/projects/new") {
    return <ProjectDetailWorkspace id={pathname.split("/").filter(Boolean)[1]} />;
  }

  if (pathname === "/projects") {
    return <ProjectsWorkspace />;
  }

  if (pathname === "/history") {
    return <HistoryWorkspace />;
  }

  return <DashboardWorkspace />;
}

function DashboardWorkspace() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.05fr)_390px] gap-5 overflow-hidden p-5">
      <section className="panel relative overflow-hidden rounded-xl p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_14%,rgba(74,110,232,0.2),transparent_32%),radial-gradient(circle_at_18%_86%,rgba(239,99,152,0.16),transparent_28%)]" />
        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(239,99,152,0.26)] bg-[rgba(239,99,152,0.08)] px-3 py-1 text-xs text-[var(--rose-soft)]">
            <Sparkles className="h-3.5 w-3.5" />
            First launch
          </div>
          <h1 className="font-serif text-[64px] leading-[0.95] text-white">Create your first AI music album.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            Start with a short album brief. Velvet will prepare a blueprint for review before any generation, rendering or upload work begins.
          </p>
          <div className="mt-7 flex gap-3">
            <Link
              href="/settings"
              className="flex h-12 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 font-medium"
            >
              Start Setup
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/settings"
              title="Complete setup before creating an album."
              className="flex h-12 items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.03] px-5 text-[var(--text-muted)]"
            >
              <Lock className="h-4 w-4" />
              Create Album After Setup
            </Link>
          </div>
        </div>
        <div className="relative mt-10 grid grid-cols-3 gap-3">
          {setupSteps.map((step, index) => (
            <Link key={step.title} href={step.href} className="rounded-xl border border-[var(--border)] bg-black/20 p-4 hover:border-[var(--border-hover)]">
              <div className="tabular text-xs text-[var(--rose-soft)]">0{index + 1}</div>
              <h2 className="mt-3 text-sm font-semibold">{step.title}</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{step.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <aside className="grid min-h-0 content-start gap-5">
        <EmptyPanel className="min-h-[148px]" title="Setup Required" body="Connect ChatGPT, ElevenLabs, and YouTube before creating the first album." action="Start setup" href="/settings" />
        <EmptyPanel className="min-h-[128px]" title="Generation Queue" body="Queue is empty. Tracks appear here after a blueprint is approved." />
        <EmptyPanel className="min-h-[148px]" title="Publishing" body="YouTube publishing is unavailable until a channel is connected." href="/settings/youtube" action="Connect YouTube" />
      </aside>
    </div>
  );
}

function ProjectsWorkspace() {
  const [projects, setProjects] = useState<ClientProject[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((response) => response.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => setProjects([]));
  }, []);

  if (projects.length > 0) {
    return (
      <div className="min-h-0 flex-1 overflow-hidden p-5">
        <section className="panel h-full rounded-xl p-5">
          <div className="flex items-center justify-between">
            <SectionTitle label="Projects" />
            <Link href="/projects/new" className="flex h-10 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-4 text-sm font-medium">
              <Plus className="h-4 w-4" />
              New Album
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {projects.slice(0, 6).map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="rounded-xl border border-[var(--border)] bg-white/[0.035] p-4 hover:border-[var(--border-hover)]">
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--rose-soft)]">{project.status}</div>
                <h2 className="mt-3 line-clamp-2 font-serif text-[28px] leading-none">{project.title}</h2>
                <p className="mt-3 line-clamp-3 text-xs leading-5 text-[var(--text-secondary)]">{project.brief}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 p-5">
      <section className="panel flex h-full flex-col items-center justify-center rounded-xl p-8 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-2xl border border-[var(--border)] bg-white/[0.04]">
          <UploadCloud className="h-8 w-8 text-[var(--rose-soft)]" />
        </div>
        <h1 className="mt-5 font-serif text-[44px] leading-none">No projects yet</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
          Your album projects will live here after you create the first blueprint.
        </p>
        <Link href="/projects/new" className="mt-6 flex h-11 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 text-sm font-medium">
          <Plus className="h-4 w-4" />
          Create Album
        </Link>
      </section>
    </div>
  );
}

function ProjectDetailWorkspace({ id }: { id: string }) {
  const [project, setProject] = useState<ClientProject | null>(null);
  const [jobs, setJobs] = useState<ClientJob[]>([]);
  const [usage, setUsage] = useState<ClientUsage[]>([]);
  const [message, setMessage] = useState("Review the blueprint before running paid generation.");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [privacy, setPrivacy] = useState<"private" | "unlisted" | "public">("private");
  const [editForm, setEditForm] = useState({
    title: "",
    concept: "",
    coverPrompt: "",
    videoPrompt: "",
    youtubeTitle: "",
    youtubeDescription: "",
    youtubeTags: ""
  });

  const loadProject = useCallback(async () => {
    const response = await fetch(`/api/projects/${id}`);
    const data = await response.json();
    setProject(data.project ?? null);
    setJobs(data.jobs ?? []);
    setUsage(data.usage ?? []);
    if (data.project?.blueprint) {
      setEditForm({
        title: data.project.title ?? "",
        concept: data.project.blueprint.concept ?? "",
        coverPrompt: data.project.blueprint.coverPrompt ?? "",
        videoPrompt: data.project.blueprint.videoPrompt ?? "",
        youtubeTitle: data.project.blueprint.youtube.title ?? "",
        youtubeDescription: data.project.blueprint.youtube.description ?? "",
        youtubeTags: data.project.blueprint.youtube.tags?.join(", ") ?? ""
      });
    }
  }, [id]);

  useEffect(() => {
    loadProject().catch(() => setMessage("Project could not be loaded."));
  }, [loadProject]);

  async function runAction(action: "approve" | "music" | "render" | "upload") {
    const endpoints = {
      approve: `/api/projects/${id}/approve`,
      music: "/api/music",
      render: "/api/render",
      upload: "/api/youtube/upload"
    };

    setBusyAction(action);
    setMessage(`${actionLabel(action)}...`);

    try {
      const response = await fetch(endpoints[action], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id, privacy })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? `${actionLabel(action)} failed.`);
      }

      setMessage(data.message ?? `${actionLabel(action)} complete.`);
      await loadProject();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${actionLabel(action)} failed.`);
      await loadProject().catch(() => undefined);
    } finally {
      setBusyAction(null);
    }
  }

  async function saveProjectEdits() {
    setBusyAction("save");
    setMessage("Saving project edits...");

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Project edits could not be saved.");
      }

      setIsEditing(false);
      setMessage("Project edits saved.");
      await loadProject();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Project edits could not be saved.");
    } finally {
      setBusyAction(null);
    }
  }

  if (!project) {
    return (
      <div className="min-h-0 flex-1 p-5">
        <section className="panel flex h-full items-center justify-center rounded-xl text-sm text-[var(--text-secondary)]">
          {message}
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-5 overflow-hidden p-5">
      <section className="panel min-h-0 overflow-hidden rounded-xl p-5">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--rose-soft)]">{project.status}</div>
            <h1 className="mt-2 line-clamp-2 font-serif text-[44px] leading-none">{project.title}</h1>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{project.blueprint?.concept ?? project.brief}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <WorkflowButton label={isEditing ? "Done" : "Edit"} active={busyAction === "save"} onClick={() => (isEditing ? saveProjectEdits() : setIsEditing(true))} disabled={!project.blueprint} />
            <WorkflowButton label="Approve" active={busyAction === "approve"} onClick={() => runAction("approve")} disabled={project.status !== "blueprint"} />
            <WorkflowButton label="Generate" active={busyAction === "music"} onClick={() => runAction("music")} disabled={!["approved", "generating"].includes(project.status)} />
            <WorkflowButton label="Render" active={busyAction === "render"} onClick={() => runAction("render")} disabled={!project.generatedTracks?.length} />
            <WorkflowButton label="Upload" active={busyAction === "upload"} onClick={() => runAction("upload")} disabled={!project.render?.videoPath} />
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-[var(--border)] bg-black/15 px-3 py-2 text-xs text-[var(--text-secondary)]">{message}</div>

        <div className="mt-4 grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4">
          <div className="space-y-3">
            <SectionTitle label="Track Prompts" />
            <div className="grid max-h-[410px] gap-2 overflow-hidden">
              {(project.blueprint?.tracks ?? []).slice(0, 6).map((track, index) => (
                <article key={track.title} className="rounded-lg border border-[var(--border)] bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="truncate text-sm font-medium">
                      {String(index + 1).padStart(2, "0")} {track.title}
                    </h2>
                    <span className="text-xs text-[var(--text-muted)]">{formatDuration(track.durationSeconds)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{track.prompt}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <SectionTitle label="Release Package" />
            {isEditing ? (
              <div className="space-y-2">
                <EditField label="Title" value={editForm.title} onChange={(value) => setEditForm((current) => ({ ...current, title: value }))} />
                <EditArea label="Concept" value={editForm.concept} onChange={(value) => setEditForm((current) => ({ ...current, concept: value }))} />
                <EditArea label="Cover prompt" value={editForm.coverPrompt} onChange={(value) => setEditForm((current) => ({ ...current, coverPrompt: value }))} />
                <EditArea label="Video prompt" value={editForm.videoPrompt} onChange={(value) => setEditForm((current) => ({ ...current, videoPrompt: value }))} />
                <EditField label="YouTube title" value={editForm.youtubeTitle} onChange={(value) => setEditForm((current) => ({ ...current, youtubeTitle: value }))} />
                <EditArea label="YouTube description" value={editForm.youtubeDescription} onChange={(value) => setEditForm((current) => ({ ...current, youtubeDescription: value }))} />
                <EditField label="Tags" value={editForm.youtubeTags} onChange={(value) => setEditForm((current) => ({ ...current, youtubeTags: value }))} />
              </div>
            ) : (
              <>
                <InfoTile label="Cover prompt" value={project.blueprint?.coverPrompt ?? "Waiting for blueprint"} />
                <InfoTile label="Video prompt" value={project.blueprint?.videoPrompt ?? "Waiting for blueprint"} />
                <InfoTile label="YouTube title" value={project.blueprint?.youtube.title ?? "Waiting for blueprint"} />
              </>
            )}
            <InfoTile label="Render" value={project.render?.message ?? "Not rendered yet"} />
          </div>
        </div>
      </section>

      <aside className="space-y-3 overflow-hidden">
        <aside className="panel rounded-xl p-4">
          <SectionTitle label="Job Queue" />
          <div className="mt-3 space-y-2">
            {(jobs.length ? jobs : [{ id: "empty", type: "ready", status: "idle", message: "No project jobs yet." }]).slice(0, 4).map((job) => (
              <div key={job.id} className="rounded-lg border border-[var(--border)] bg-white/[0.035] p-3">
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.12em] text-[var(--rose-soft)]">
                  <span>{job.type}</span>
                  <span>{job.status}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{job.message}</p>
              </div>
            ))}
          </div>
        </aside>
        <aside className="panel rounded-xl p-4">
          <SectionTitle label="Upload" />
          <label className="mt-3 block text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Privacy
            <select
              value={privacy}
              onChange={(event) => setPrivacy(event.target.value as "private" | "unlisted" | "public")}
              className="mt-1.5 h-9 w-full rounded-lg border border-[var(--border)] bg-black/20 px-3 text-xs normal-case tracking-normal text-white outline-none"
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
          </label>
        </aside>
        <aside className="panel rounded-xl p-4">
          <SectionTitle label="Usage" />
          <div className="mt-3 space-y-2">
            {(usage.length ? usage : [{ id: "empty", provider: "ready", operation: "No usage recorded yet.", units: {} }]).slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--border)] bg-white/[0.035] p-3 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="uppercase tracking-[0.12em] text-[var(--rose-soft)]">{item.provider}</div>
                  {item.costStatus ? <div className="text-[var(--text-muted)]">{formatCost(item)}</div> : null}
                </div>
                <div className="mt-1">{item.operation}</div>
              </div>
            ))}
          </div>
        </aside>
        <EmptyPanel title="Files" body={project.generatedTracks?.length ? `${project.generatedTracks.length} generated track file(s) stored locally.` : "Generated audio and render outputs appear in the local Velvet export folder."} />
      </aside>
    </div>
  );
}

function WorkflowButton({
  label,
  active,
  disabled,
  onClick
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || active}
      className="h-9 rounded-lg border border-[var(--border)] bg-white/[0.05] px-3 text-xs text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {active ? "Working..." : label}
    </button>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-white/[0.035] p-3">
      <div className="text-xs uppercase tracking-[0.14em] text-[var(--rose-soft)]">{label}</div>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--text-secondary)]">{value}</p>
    </article>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-8 w-full rounded-lg border border-[var(--border)] bg-black/15 px-3 text-xs normal-case tracking-normal text-white outline-none"
      />
    </label>
  );
}

function EditArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-16 w-full resize-none rounded-lg border border-[var(--border)] bg-black/15 px-3 py-2 text-xs normal-case tracking-normal text-white outline-none"
      />
    </label>
  );
}

function actionLabel(action: "approve" | "music" | "render" | "upload") {
  return {
    approve: "Approving blueprint",
    music: "Generating music",
    render: "Rendering package",
    upload: "Uploading to YouTube"
  }[action];
}

function formatCost(usage: ClientUsage) {
  if (usage.costStatus === "estimated" && typeof usage.estimatedCostUsd === "number") {
    return `$${usage.estimatedCostUsd.toFixed(4)}`;
  }

  return "Rate not set";
}

function HistoryWorkspace() {
  const [prompts, setPrompts] = useState<ClientPrompt[]>([]);
  const [jobs, setJobs] = useState<ClientJob[]>([]);
  const [uploads, setUploads] = useState<ClientUpload[]>([]);

  useEffect(() => {
    fetch("/api/uploads")
      .then((response) => response.json())
      .then((data) => setUploads(data.uploads ?? []))
      .catch(() => setUploads([]));
    fetch("/api/prompts")
      .then((response) => response.json())
      .then((data) => setPrompts(data.prompts ?? []))
      .catch(() => setPrompts([]));
    fetch("/api/jobs")
      .then((response) => response.json())
      .then((data) => setJobs(data.jobs ?? []))
      .catch(() => setJobs([]));
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-hidden p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-5">
        <section className="panel rounded-xl p-5">
          <SectionTitle label="Upload History" />
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Every uploaded album will be logged here with the exact prompts, render settings, privacy choice, YouTube link and upload result.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-[var(--border)] bg-black/15">
            <div className="grid grid-cols-[1.1fr_1fr_0.7fr_0.8fr_0.7fr_0.7fr] border-b border-[var(--border)] bg-white/[0.035] px-4 py-3 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {historyColumns.map((column) => (
                <div key={column}>{column}</div>
              ))}
            </div>
            {uploads.length > 0 ? (
              <div className="max-h-[290px] overflow-hidden">
                {uploads.slice(0, 7).map((upload) => (
                  <div key={upload.id} className="grid grid-cols-[1.1fr_1fr_0.7fr_0.8fr_0.7fr_0.7fr] items-center border-b border-[var(--border)] px-4 py-3 text-xs text-[var(--text-secondary)] last:border-b-0">
                    <a href={upload.url} className="truncate text-[var(--rose-soft)]" target="_blank" rel="noreferrer">
                      {upload.url ? "YouTube video" : upload.id.slice(0, 8)}
                    </a>
                    <Link href={`/projects/${upload.projectId}`} className="truncate text-white">
                      {upload.projectTitle ?? upload.projectId}
                    </Link>
                    <div className="capitalize">{upload.privacy}</div>
                    <div>{new Date(upload.createdAt).toLocaleDateString()}</div>
                    <div>{upload.prompts?.length ?? 0}</div>
                    <div className="capitalize">{upload.status}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[250px] flex-col items-center justify-center px-6 py-8 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[var(--border)] bg-white/[0.04]">
                  <History className="h-7 w-7 text-[var(--rose-soft)]" />
                </div>
                <h1 className="mt-4 font-serif text-[34px] leading-none">No uploads yet</h1>
                <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                  After an album is uploaded to YouTube, this log will show the upload record and open a complete prompt archive for that release.
                </p>
                <Link href="/projects/new" className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.05] px-4 text-sm text-[var(--text-secondary)]">
                  Create first album
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <aside className="panel rounded-xl p-5">
            <SectionTitle label="Prompt Archive" />
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Each upload keeps a readable copy of every prompt that shaped the final release.
            </p>
            <div className="mt-4 space-y-2">
              {(prompts.length > 0 ? prompts.slice(0, 7).map((prompt) => `${prompt.kind} v${prompt.version}`) : historyPromptTypes).map((type) => (
                <div key={type} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-white/[0.035] p-3 text-sm text-[var(--text-secondary)]">
                  <FileText className="h-4 w-4 shrink-0 text-[var(--rose-soft)]" />
                  {type}
                </div>
              ))}
            </div>
          </aside>
          <aside className="panel rounded-xl p-5">
            <SectionTitle label="Stored With Upload" />
            <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
              {(jobs.length > 0 ? jobs.slice(0, 6).map((job) => `${job.type}: ${job.message}`) : ["Final video URL", "YouTube video ID", "Thumbnail asset", "Render manifest", "Provider usage", "Error and retry log"]).map((item) => (
                <div key={item} className="rounded-lg border border-[var(--border)] bg-white/[0.035] p-3">
                  {item}
                </div>
              ))}
            </div>
          </aside>
        </aside>
      </div>
    </div>
  );
}

function SettingsWorkspace() {
  const [youtubeStatus, setYoutubeStatus] = useState<string | null>(null);
  const [activeSetupStep, setActiveSetupStep] = useState<"services" | "youtube" | "review">("services");
  const [savedNotice, setSavedNotice] = useState(false);
  const [setupMessage, setSetupMessage] = useState("Keys are encrypted before being stored locally.");
  const [providerStatus, setProviderStatus] = useState<Record<string, ClientStatus>>({});
  const [setupForm, setSetupForm] = useState<SetupForm>({
    openaiApiKey: "",
    elevenLabsApiKey: "",
    planningModel: "gpt-4.1",
    imageModel: "gpt-image-1",
    musicModel: "eleven-music",
    outputFormat: "mp3_44100_128",
    supabaseUrl: "",
    supabasePublishableKey: "",
    databaseUrl: "",
    storageBucket: "velvet-assets",
    workerSecret: "",
    maxTracksPerRun: "10",
    maxRenderAttemptsPerProject: "5",
    openaiInputPerMillionTokens: "",
    openaiOutputPerMillionTokens: "",
    elevenLabsPerMinute: "",
    ffmpegPerRenderMinute: "",
    youtubeUploadPerVideo: ""
  });

  useEffect(() => {
    setYoutubeStatus(new URLSearchParams(window.location.search).get("youtube"));
    fetch("/api/setup")
      .then((response) => response.json())
      .then((data) => {
        const setup = data.setup ?? {};
        setProviderStatus({
          openai: setup.openai?.status,
          elevenlabs: setup.elevenlabs?.status,
          youtube: setup.youtube?.status,
          worker: setup.worker?.status,
          database: setup.worker?.databaseStatus
        });
        setSetupForm((current) => ({
          ...current,
          planningModel: setup.openai?.planningModel ?? current.planningModel,
          imageModel: setup.openai?.imageModel ?? current.imageModel,
          musicModel: setup.elevenlabs?.musicModel ?? current.musicModel,
          outputFormat: setup.elevenlabs?.outputFormat ?? current.outputFormat,
          supabaseUrl: setup.worker?.supabaseUrl ?? current.supabaseUrl,
          supabasePublishableKey: setup.worker?.supabasePublishableKey ?? current.supabasePublishableKey,
          storageBucket: setup.worker?.storageBucket ?? current.storageBucket,
          maxTracksPerRun: String(setup.budget?.maxTracksPerRun ?? current.maxTracksPerRun),
          maxRenderAttemptsPerProject: String(setup.budget?.maxRenderAttemptsPerProject ?? current.maxRenderAttemptsPerProject),
          openaiInputPerMillionTokens: String(setup.pricing?.openaiInputPerMillionTokens ?? current.openaiInputPerMillionTokens),
          openaiOutputPerMillionTokens: String(setup.pricing?.openaiOutputPerMillionTokens ?? current.openaiOutputPerMillionTokens),
          elevenLabsPerMinute: String(setup.pricing?.elevenLabsPerMinute ?? current.elevenLabsPerMinute),
          ffmpegPerRenderMinute: String(setup.pricing?.ffmpegPerRenderMinute ?? current.ffmpegPerRenderMinute),
          youtubeUploadPerVideo: String(setup.pricing?.youtubeUploadPerVideo ?? current.youtubeUploadPerVideo)
        }));
      })
      .catch(() => setSetupMessage("Setup status is unavailable."));
  }, []);

  function updateSetupForm(field: keyof SetupForm, value: string) {
    setSetupForm((current) => ({ ...current, [field]: value }));
  }

  async function saveSetup() {
    setSetupMessage("Saving encrypted setup...");
    const response = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setupForm)
    });
    const data = await response.json();
    setProviderStatus({
      openai: data.setup?.openai?.status,
      elevenlabs: data.setup?.elevenlabs?.status,
      youtube: data.setup?.youtube?.status,
      worker: data.setup?.worker?.status,
      database: data.setup?.worker?.databaseStatus
    });
    setSavedNotice(response.ok);
    setSetupMessage(response.ok ? "Setup saved. Run tests to verify provider keys." : "Setup could not be saved.");
  }

  async function validateProvider(provider: "openai" | "elevenlabs" | "database") {
    setSetupMessage(`Checking ${provider === "openai" ? "ChatGPT" : provider === "elevenlabs" ? "ElevenLabs" : "database"}...`);
    const response = await fetch("/api/setup/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider })
    });
    const data = await response.json();
    setProviderStatus((current) => ({ ...current, [provider]: data.status }));
    setSetupMessage(data.status?.message ?? (response.ok ? "Provider is ready." : "Provider check failed."));
  }

  async function syncDatabase() {
    setSetupMessage("Initializing and syncing database...");
    const response = await fetch("/api/database/sync", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      setSetupMessage(data.error ?? "Database sync failed.");
      return;
    }

    setProviderStatus((current) => ({
      ...current,
      database: {
        state: "valid",
        message: `Database synced: ${data.counts.projects} projects, ${data.counts.jobs} jobs.`
      }
    }));
    setSetupMessage("Database initialized and synced.");
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-5">
        <section className="panel rounded-xl p-4">
          <SectionTitle label="Onboarding" />
          <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
            Connect the minimum services Velvet needs: ChatGPT for creative planning, ElevenLabs for music, and YouTube for private review uploads. Secrets are shown here as setup fields only until the secure server-side vault is implemented.
          </p>

          <div className="mt-3 grid grid-cols-[120px_1fr] gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-white/[0.035] p-3">
              <div className="text-xs text-[var(--text-muted)]">Setup progress</div>
              <div className="mt-2 font-serif text-[34px] leading-none">0 / 3</div>
              <div className="mt-2 h-1.5 rounded-full bg-black/25">
                <div className="h-full w-0 rounded-full bg-[linear-gradient(90deg,var(--blue),var(--rose))]" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["services", "01", "AI + Music"],
                ["youtube", "02", "YouTube"],
                ["review", "03", "Review"]
              ].map(([key, number, label]) => (
                <button
                  key={key}
                  data-testid="onboarding-step"
                  onClick={() => setActiveSetupStep(key as "services" | "youtube" | "review")}
                  className={`flex h-12 flex-col justify-center rounded-lg border px-3 text-left ${
                    activeSetupStep === key ? "border-[var(--border-active)] bg-[rgba(239,99,152,0.09)]" : "border-[var(--border)] bg-white/[0.035]"
                  }`}
                >
                  <span className="tabular text-[11px] leading-none text-[var(--rose-soft)]">{number}</span>
                  <span className="mt-1.5 truncate text-[11px] font-medium leading-none">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            {activeSetupStep === "services" ? (
              <div className="grid grid-cols-2 gap-3">
                <SetupCard
                  icon={<KeyRound className="h-5 w-5" />}
                  title="ChatGPT / OpenAI"
                  body="Used for album blueprints, prompt revisions, artwork prompts, image generation and YouTube metadata."
                  status="Not checked"
                >
                  <Field
                    label="OpenAI API key"
                    placeholder="sk-..."
                    secret
                    value={setupForm.openaiApiKey}
                    onChange={(value) => updateSetupForm("openaiApiKey", value)}
                    help="Used for album planning, prompt rewriting, artwork prompts, and metadata."
                  />
                  <div className="flex gap-2">
                    <button onClick={() => validateProvider("openai")} className="h-8 rounded-lg border border-[var(--border)] bg-white/[0.05] px-3 text-xs text-[var(--text-secondary)]">
                      Test ChatGPT key
                    </button>
                    <AdvancedSetup label="Model defaults">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Planning model" placeholder="Velvet decides" value={setupForm.planningModel} onChange={(value) => updateSetupForm("planningModel", value)} />
                        <Field label="Image model" placeholder="Velvet decides" value={setupForm.imageModel} onChange={(value) => updateSetupForm("imageModel", value)} />
                      </div>
                    </AdvancedSetup>
                  </div>
                  <StatusLine status={providerStatus.openai} />
                </SetupCard>

                <SetupCard
                  icon={<Music2 className="h-5 w-5" />}
                  title="ElevenLabs"
                  body="Used only when approved track prompts are ready for music generation."
                  status="Not checked"
                >
                  <Field
                    label="ElevenLabs API key"
                    placeholder="Enter key"
                    secret
                    value={setupForm.elevenLabsApiKey}
                    onChange={(value) => updateSetupForm("elevenLabsApiKey", value)}
                    help="Used only after you approve track prompts."
                  />
                  <div className="flex gap-2">
                    <button onClick={() => validateProvider("elevenlabs")} className="h-8 rounded-lg border border-[var(--border)] bg-white/[0.05] px-3 text-xs text-[var(--text-secondary)]">
                      Test ElevenLabs key
                    </button>
                    <AdvancedSetup label="Music defaults">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Music model" placeholder="Velvet decides" value={setupForm.musicModel} onChange={(value) => updateSetupForm("musicModel", value)} />
                        <Field label="Output format" placeholder="Velvet decides" value={setupForm.outputFormat} onChange={(value) => updateSetupForm("outputFormat", value)} />
                      </div>
                    </AdvancedSetup>
                  </div>
                  <StatusLine status={providerStatus.elevenlabs} />
                </SetupCard>
              </div>
            ) : null}

            {activeSetupStep === "youtube" ? (
              <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-3">
                <SetupCard
                  icon={<Youtube className="h-5 w-5" />}
                  title="YouTube"
                  body="Connect with Google OAuth. Velvet will request permission to upload videos and read channel identity."
                  status="Not connected"
                >
                  <Link
                    href="/api/youtube/login"
                    title="Connects your channel through Google OAuth. Velvet never asks for your YouTube password."
                    className="flex h-9 items-center justify-center gap-2 rounded-lg bg-[rgba(255,0,51,0.84)] px-4 text-sm font-medium text-white shadow-[0_10px_26px_rgba(255,0,51,0.14)]"
                  >
                    <Youtube className="h-4 w-4" />
                    Login to YouTube
                  </Link>
                  <p className="text-xs leading-5 text-[var(--text-muted)]">
                    OAuth client ID, client secret, and redirect URI live in server environment variables.
                  </p>
                </SetupCard>
                <div className="rounded-xl border border-[var(--border)] bg-white/[0.035] p-3">
                  <div className="text-sm font-medium">Channel preview</div>
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-black/15 p-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-white/[0.04]">
                      <Youtube className="h-5 w-5 text-[var(--text-muted)]" />
                    </div>
                    <div>
                      <div className="text-sm text-[var(--text-secondary)]">{providerStatus.youtube?.state === "connected" ? "Connected" : "Not connected"}</div>
                      <div className="text-xs text-[var(--text-muted)]">{providerStatus.youtube?.message ?? "Channel name and handle appear here."}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeSetupStep === "review" ? (
              <div className="grid grid-cols-2 gap-3">
                <SetupCard
                  icon={<Database className="h-5 w-5" />}
                  title="Storage & worker"
                  body="Needed later for generated audio, images, videos, logs and long-running jobs."
                  status="Not configured"
                >
                  <AdvancedSetup label="Storage and worker settings">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Supabase URL" placeholder="https://project.supabase.co" value={setupForm.supabaseUrl} onChange={(value) => updateSetupForm("supabaseUrl", value)} help="Used as the Supabase project reference for future storage/API wiring." />
                      <Field label="Publishable key" placeholder="sb_publishable_..." value={setupForm.supabasePublishableKey} onChange={(value) => updateSetupForm("supabasePublishableKey", value)} help="Safe client-side Supabase key for future storage and auth flows." />
                      <Field label="Storage bucket" placeholder="velvet-assets" value={setupForm.storageBucket} onChange={(value) => updateSetupForm("storageBucket", value)} help="Where audio, artwork, renders, logs, and metadata will be stored." />
                      <Field label="Database URL" placeholder="postgres://..." secret value={setupForm.databaseUrl} onChange={(value) => updateSetupForm("databaseUrl", value)} help="Saved encrypted. Use the Supabase pooled or direct Postgres connection string." />
                      <Field label="Worker secret" placeholder="Enter secret" secret value={setupForm.workerSecret} onChange={(value) => updateSetupForm("workerSecret", value)} help="Used to verify long-running background job requests." />
                    </div>
                  </AdvancedSetup>
                  <button onClick={() => validateProvider("database")} className="h-8 rounded-lg border border-[var(--border)] bg-white/[0.05] px-3 text-xs text-[var(--text-secondary)]">
                    Test Database
                  </button>
                  <button onClick={syncDatabase} className="ml-2 h-8 rounded-lg border border-[var(--border)] bg-white/[0.05] px-3 text-xs text-[var(--text-secondary)]">
                    Initialize & Sync
                  </button>
                  <StatusLine status={providerStatus.database} />
                </SetupCard>
                <SetupCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Budget guardrails"
                  body="Set hard limits for expensive actions. Pricing can be added later once provider billing is confirmed."
                  status="Local limits"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Max tracks/run" placeholder="10" value={setupForm.maxTracksPerRun} onChange={(value) => updateSetupForm("maxTracksPerRun", value)} />
                    <Field label="Max render attempts" placeholder="5" value={setupForm.maxRenderAttemptsPerProject} onChange={(value) => updateSetupForm("maxRenderAttemptsPerProject", value)} />
                  </div>
                  <AdvancedSetup label="Cost estimate rates">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="OpenAI input / 1M" placeholder="USD" value={setupForm.openaiInputPerMillionTokens} onChange={(value) => updateSetupForm("openaiInputPerMillionTokens", value)} help="Optional. Used only for local cost estimates." />
                      <Field label="OpenAI output / 1M" placeholder="USD" value={setupForm.openaiOutputPerMillionTokens} onChange={(value) => updateSetupForm("openaiOutputPerMillionTokens", value)} help="Optional. Used only for local cost estimates." />
                      <Field label="ElevenLabs / min" placeholder="USD" value={setupForm.elevenLabsPerMinute} onChange={(value) => updateSetupForm("elevenLabsPerMinute", value)} help="Optional. Match this to your plan or internal budget." />
                      <Field label="FFmpeg / min" placeholder="USD" value={setupForm.ffmpegPerRenderMinute} onChange={(value) => updateSetupForm("ffmpegPerRenderMinute", value)} help="Optional compute-rate estimate for rendered minutes." />
                      <Field label="YouTube / upload" placeholder="USD" value={setupForm.youtubeUploadPerVideo} onChange={(value) => updateSetupForm("youtubeUploadPerVideo", value)} help="Optional fixed operational estimate per upload." />
                    </div>
                  </AdvancedSetup>
                </SetupCard>
              </div>
            ) : null}
          </div>

          {youtubeStatus ? <YouTubeStatusNotice status={youtubeStatus} /> : null}

          <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-[rgba(239,99,152,0.22)] bg-[rgba(239,99,152,0.06)] p-3">
            <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="h-4 w-4 text-[var(--rose-soft)]" />
              Server-side only
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              Real keys and OAuth tokens must be encrypted and stored server-side. Setup can be saved locally as draft state before the vault is wired.
            </p>
            </div>
            <button
              onClick={saveSetup}
              className="h-10 shrink-0 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 text-sm font-medium"
              title="Stores configuration after backend secret storage is enabled."
            >
              Save Setup
            </button>
          </div>
          {savedNotice ? (
            <div className="mt-2 rounded-lg border border-[rgba(88,182,168,0.22)] bg-[rgba(88,182,168,0.06)] px-3 py-2 text-xs text-[var(--text-secondary)]">
              {setupMessage}
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-3 gap-3">
            {["Prompt/version history", "Error log", "Job queue"].map((item) => (
              <div key={item} className="rounded-lg border border-[var(--border)] bg-black/15 p-2 text-xs text-[var(--text-muted)]">
                {item}
              </div>
            ))}
          </div>
        </section>
        <aside className="space-y-4">
          <aside className="panel rounded-xl p-5">
            <SectionTitle label="Required Services" />
            <div className="mt-4 space-y-3">
              {setupStatusItems.map((item) => (
                <div key={item.label} className="rounded-lg border border-[var(--border)] bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-3 text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--text-muted)]" />
                      {item.label === "ChatGPT" ? "ChatGPT / OpenAI" : item.label}
                    </span>
                    <span className="rounded-full border border-[var(--border)] bg-black/10 px-2 py-0.5 text-[11px] text-[var(--text-muted)]">{item.state}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
          <aside className="panel rounded-xl p-5">
            <SectionTitle label="Safety Defaults" />
            <div className="mt-4 space-y-3">
            {safetyDefaults.map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border border-[var(--border)] bg-white/[0.035] p-3 text-sm text-[var(--text-secondary)]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                  {item}
                </div>
              ))}
            </div>
          </aside>
        </aside>
      </div>
    </div>
  );
}

function YouTubeStatusNotice({ status }: { status: string }) {
  const message =
    status === "missing_config"
      ? "YouTube login needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and YOUTUBE_REDIRECT_URI in the server environment."
      : status === "authorized_pending_storage"
        ? "YouTube authorized successfully. Token exchange and encrypted storage are the next backend step."
        : status === "connected"
          ? "YouTube connected successfully. Refresh token stored encrypted."
          : status === "token_exchange_failed"
            ? "YouTube authorized, but token exchange failed. Check the OAuth client and redirect URI."
        : status === "invalid_state"
          ? "YouTube login could not be verified. Please try again."
          : "YouTube login was not completed.";

  return (
    <div className="mt-3 rounded-xl border border-[rgba(213,161,94,0.28)] bg-[rgba(213,161,94,0.07)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
      {message}
    </div>
  );
}

function NewProjectFlow() {
  const [brief, setBrief] = useState("");
  const [message, setMessage] = useState("Blueprint generation uses your encrypted OpenAI key after setup.");
  const [isCreating, setIsCreating] = useState(false);

  async function createBlueprint() {
    setIsCreating(true);
    setMessage("Creating blueprint...");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Blueprint generation failed.");
      }

      setMessage(`Blueprint created: ${data.project.title}`);
      window.location.href = `/projects/${data.project.id}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Blueprint generation failed.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden p-5">
      <div className="mx-auto grid max-w-[1120px] grid-cols-[1fr_340px] gap-5">
        <section className="panel rounded-xl p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rose-soft)]">New album</div>
          <h1 className="mt-2 font-serif text-[48px] leading-none">Describe the album.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Keep it simple. Mood, instrumentation, length and intended YouTube style are enough to begin.
          </p>
          <textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            className="mt-5 min-h-[250px] w-full resize-none rounded-xl border border-[var(--border)] bg-black/20 p-4 text-sm leading-6 text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]"
            placeholder="Example: A moody late-night jazz album with slow saxophone, intimate piano and brushed drums. Instrumental, cinematic, elegant, and made for a long-form YouTube release."
            aria-label="Album brief"
          />
          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-xs leading-5 text-[var(--text-muted)]">{message}</p>
            <button
              onClick={createBlueprint}
              disabled={isCreating}
              className="flex h-12 shrink-0 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create Blueprint"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
        <aside className="space-y-4">
          <EmptyPanel title="Optional" body="After the brief, Velvet can ask for length, track count, vocals and workflow mode only if needed." />
          <EmptyPanel title="Before generation" body="You will review the blueprint first. ChatGPT and ElevenLabs calls stay blocked until approved." />
        </aside>
      </div>
    </div>
  );
}

function EmptyPanel({ title, body, action, href, className = "" }: { title: string; body: string; action?: string; href?: string; className?: string }) {
  const content = (
    <article className={`panel rounded-xl p-5 ${className}`}>
      <SectionTitle label={title} />
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
      {action && href ? (
        <div className="mt-4 text-sm text-[var(--rose-soft)]">
          {action}
          <ArrowRight className="ml-2 inline h-4 w-4" />
        </div>
      ) : null}
    </article>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function SetupCard({
  icon,
  title,
  body,
  children,
  status
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children: React.ReactNode;
  status?: string;
}) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-white/[0.035] p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-black/15 text-[var(--rose-soft)] [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-1 text-xs leading-4 text-[var(--text-muted)]">{body}</p>
        </div>
        {status ? (
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-black/15 px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
            {status}
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </article>
  );
}

function AdvancedSetup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-black/10 px-3 py-2 text-xs text-[var(--text-secondary)]">
      <summary className="cursor-pointer list-none text-[var(--rose-soft)]">{label}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function StatusLine({ status }: { status?: ClientStatus }) {
  if (!status?.message) {
    return null;
  }

  return <p className="text-xs leading-5 text-[var(--text-muted)]">{status.message}</p>;
}

function Field({
  label,
  placeholder,
  secret = false,
  help,
  value,
  onChange
}: {
  label: string;
  placeholder: string;
  secret?: boolean;
  help?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
      <span className="flex items-center gap-1.5">
        {label}
        {help ? (
          <span title={help} aria-label={help}>
            <HelpCircle className="h-3.5 w-3.5 text-[var(--rose-soft)]" aria-hidden="true" />
          </span>
        ) : null}
      </span>
      <input
        type={secret ? "password" : "text"}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-1.5 h-8 w-full rounded-lg border border-[var(--border)] bg-black/15 px-3 text-xs normal-case tracking-normal text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]"
        placeholder={placeholder}
      />
    </label>
  );
}

function BottomPlayer() {
  const { isPlaying, positionSeconds, volume, togglePlaying, setVolume } = usePlayerStore();
  return (
    <footer className="panel mt-4 grid h-20 grid-cols-[310px_1fr_230px] items-center gap-6 rounded-xl px-5">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-white/[0.035]">
          <Play className="h-5 w-5 text-[var(--text-muted)]" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-[var(--text-secondary)]">Nothing playing</div>
          <div className="mt-1 truncate text-xs text-[var(--text-muted)]">Create an album to add tracks</div>
        </div>
      </div>
      <div className="grid grid-cols-[140px_1fr_90px] items-center gap-5">
        <div className="flex items-center justify-center">
          <motion.button
            whileTap={{ scale: 0.94 }}
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={togglePlaying}
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] bg-white/[0.04] text-[var(--text-muted)]"
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
          </motion.button>
        </div>
        <div className="flex h-12 items-center gap-1 opacity-35">
          {Array.from({ length: 42 }).map((_, index) => (
            <span key={index} className="h-3 w-0.5 rounded-full bg-[var(--text-muted)]" />
          ))}
        </div>
        <div className="tabular text-sm text-[var(--text-muted)]">{formatDuration(positionSeconds)} / --:--</div>
      </div>
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        <Volume2 className="h-5 w-5" />
        <input
          aria-label="Volume"
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
          className="h-1 w-28 accent-[var(--rose-soft)]"
        />
      </div>
    </footer>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-[var(--rose-soft)]" />
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">{label}</h2>
    </div>
  );
}

function getPageTitle(pathname: string) {
  if (pathname === "/projects/new") {
    return "New Album";
  }
  if (pathname === "/projects") {
    return "Projects";
  }
  if (pathname === "/history") {
    return "History";
  }
  if (pathname.startsWith("/settings")) {
    return "Settings";
  }
  return "Welcome";
}
