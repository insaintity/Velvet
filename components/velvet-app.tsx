"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  Clapperboard,
  Database,
  Download,
  ExternalLink,
  FileText,
  Focus,
  Globe2,
  HelpCircle,
  ImageIcon,
  KeyRound,
  Link2,
  Lock,
  ListMusic,
  ListRestart,
  LogOut,
  Music2,
  PanelRight,
  Pause,
  Play,
  Plus,
  Repeat2,
  Save,
  Search,
  ShieldCheck,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Upload,
  Volume2,
  WandSparkles,
  Youtube
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { historyColumns, historyPromptTypes, navItems, safetyDefaults } from "@/lib/app-data";
import { formatDuration } from "@/lib/time";
import { usePlayerStore } from "@/store/player-store";
import { CommandPalette, ProjectArtwork, StatusPill, Waveform } from "@/components/studio-chrome";
import type { StudioProduction, StudioTrack } from "@/components/project-studio-tools";
import { emitToast, ToastHost } from "@/components/toast-system";
import { configureYouTubeOAuth, saveAndValidateSetup, useSetupController, useSetupOverview, waitForYouTubeConnection, type ClientStatus, type SetupOverview } from "@/components/setup-controller";
import { cachedJson, peekCachedJson, startStudioEvents } from "@/components/data-cache";

const PublishingWorkspace = dynamic(() => import("@/components/publishing-workspaces").then((module) => module.PublishingWorkspace));
const AnalyticsWorkspace = dynamic(() => import("@/components/publishing-workspaces").then((module) => module.AnalyticsWorkspace));
const TrackAuditionDrawer = dynamic(() => import("@/components/project-studio-tools").then((module) => module.TrackAuditionDrawer), { ssr: false });
const CreativeVariantsDrawer = dynamic(() => import("@/components/project-studio-tools").then((module) => module.CreativeVariantsDrawer), { ssr: false });
const SequenceDrawer = dynamic(() => import("@/components/project-studio-tools").then((module) => module.SequenceDrawer), { ssr: false });
const GenerationDrawer = dynamic(() => import("@/components/project-studio-tools").then((module) => module.GenerationDrawer), { ssr: false });
const ReferenceUploader = dynamic(() => import("@/components/project-studio-tools").then((module) => module.ReferenceUploader), { ssr: false });
const StudioHealth = dynamic(() => import("@/components/studio-health").then((module) => module.StudioHealth), { ssr: false });
const NewProjectWorkspace = dynamic(() => import("@/components/new-project-workspace").then((module) => module.NewProjectWorkspace), { ssr: false });
const PromptProducer = dynamic(() => import("@/components/prompt-producer").then((module) => module.PromptProducer), { ssr: false });
const HistoryWorkspaceScreen = dynamic(() => import("@/components/history-workspace").then((module) => module.HistoryWorkspace));

export function VelvetApp() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const setupOverview = useSetupOverview();
  const activeTrack = usePlayerStore((state) => state.activeTrack);
  const [commandOpen, setCommandOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    startStudioEvents();
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!setupOverview.loaded) return;
    if (pathname !== "/projects/new") {
      setOnboardingOpen(false);
      return;
    }
    if (setupOverview.isComplete) {
      window.localStorage.setItem("velvet-onboarding", "complete");
      setOnboardingOpen(false);
      return;
    }

    setOnboardingOpen(!window.localStorage.getItem("velvet-onboarding"));
  }, [pathname, setupOverview.isComplete, setupOverview.loaded]);

  function dismissOnboarding(completed = false) {
    window.localStorage.setItem("velvet-onboarding", completed ? "complete" : "dismissed");
    setOnboardingOpen(false);
  }

  useEffect(() => {
    document.documentElement.classList.add("web-mode");
    document.documentElement.classList.remove("desktop-mode");
    return () => {
      document.documentElement.classList.remove("web-mode");
    };
  }, []);

  return (
    <main className="relative z-10 h-screen min-w-0 overflow-hidden p-3 text-[15px] lg:p-5">
      <div aria-hidden="true" className="window-drag-edge window-drag-edge-top" />
      <div aria-hidden="true" className="window-drag-edge window-drag-edge-right" />
      <div aria-hidden="true" className="window-drag-edge window-drag-edge-bottom" />
      <div aria-hidden="true" className="window-drag-edge window-drag-edge-left" />
      <div className={`studio-frame grid h-[calc(100vh-24px)] grid-cols-[64px_minmax(0,1fr)] gap-3 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-5 ${activeTrack ? "lg:h-[calc(100vh-136px)]" : "lg:h-[calc(100vh-40px)]"}`}>
        <Sidebar pathname={pathname} setup={setupOverview} />
        <section className="panel studio-shell flex min-h-0 flex-col overflow-hidden rounded-2xl lg:rounded-[22px]">
          <TopBar pageTitle={pageTitle} setup={setupOverview} onOpenCommand={() => setCommandOpen(true)} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={pathname} className="studio-content relative z-0 flex min-h-0 flex-1" initial={{ opacity: 0, x: 7 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
              {pathname === "/projects/new" ? <NewProjectWorkspace /> : <FreshWorkspace pathname={pathname} setup={setupOverview} />}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
      <BottomPlayer />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <FirstRunOnboarding open={onboardingOpen} setup={setupOverview} onDismiss={dismissOnboarding} />
      <ToastHost />
    </main>
  );
}

type SetupForm = {
  openaiApiKey: string;
  elevenLabsApiKey: string;
  googleClientId: string;
  googleClientSecret: string;
  planningModel: string;
  imageModel: string;
  musicModel: string;
  outputFormat: string;
  storageEndpoint: string;
  storageRegion: string;
  storageAccessKeyId: string;
  storageSecretAccessKey: string;
  databaseUrl: string;
  storageBucket: string;
  maxTracksPerRun: string;
  maxRenderAttemptsPerProject: string;
  openaiInputPerMillionTokens: string;
  openaiOutputPerMillionTokens: string;
  elevenLabsPerMinute: string;
  ffmpegPerRenderMinute: string;
  youtubeUploadPerVideo: string;
};

type ClientProject = {
  id: string;
  title: string;
  brief: string;
  mediaType?: "song" | "album";
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
  generatedTracks?: Array<{ id?: string; title: string; filePath: string; durationSeconds: number; version?: number; prompt?: string; createdAt?: string; approvedAt?: string }>;
  trackVersions?: Record<string, Array<{ id?: string; title: string; filePath: string; durationSeconds: number; version?: number; prompt?: string; createdAt?: string; approvedAt?: string }>>;
  production?: StudioProduction;
  referenceAssets?: Array<{ id: string; name: string; kind: "audio" | "artwork"; filePath: string; storagePath?: string; createdAt: string }>;
  creativeVariants?: { titles: string[]; thumbnailPrompts: string[]; createdAt: string };
  render?: {
    manifestPath: string;
    videoPath?: string;
    videoStoragePath?: string;
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
  updatedAt?: string;
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

function Sidebar({ pathname, setup }: { pathname: string; setup: SetupOverview }) {
  return (
    <aside className="panel studio-sidebar flex min-h-0 flex-col rounded-2xl px-2 py-4 lg:rounded-[22px] lg:px-4 lg:py-5">
      <div className="lg:px-2">
        <Link href="/projects/new" className="flex items-center justify-center gap-3 lg:justify-start" aria-label="Velvet AI music foundry">
          <span className="brand-mark grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[rgba(239,99,152,0.2)] bg-white/[0.035]">
            <Image src="/brand/velvet-mark.png" alt="" width={34} height={34} priority className="h-[34px] w-[34px] object-contain" />
          </span>
          <span className="hidden min-w-0 lg:block">
            <span className="block font-serif text-[32px] lowercase leading-none text-[#f7eef5]">
              velvet
            </span>
            <span className="mt-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--rose-soft)]">
              AI music foundry
            </span>
          </span>
        </Link>
      </div>

      <nav className="studio-nav mt-7 flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = isActiveNavItem(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex h-11 items-center justify-center gap-3 rounded-lg border px-0 text-sm transition lg:justify-start lg:px-4 ${
                isActive
                  ? "border-white/[.22] bg-white/[.105] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_10px_24px_rgba(12,8,20,.12)]"
                  : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-white/[0.055] hover:text-white"
              }`}
            >
              {isActive ? <motion.span layoutId="active-navigation" className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-[var(--rose-soft)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
              <Icon className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-0.5 ${isActive ? "text-[var(--rose-soft)]" : "text-[#a9a3bd]"}`} />
              <span className="studio-nav-label hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link href="/settings" className="hidden rounded-lg border border-[var(--border)] bg-white/[0.025] p-3 transition hover:border-[var(--border-hover)] hover:bg-white/[0.04] lg:block">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          <span>Studio readiness</span>
          <span className="tabular text-[var(--text-secondary)]">{setup.requiredReadyCount}/{setup.requiredTotal}</span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--violet),var(--rose))] transition-[width] duration-500"
            style={{ width: `${(setup.requiredReadyCount / setup.requiredTotal) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex gap-1.5" aria-label={`${setup.requiredReadyCount} of ${setup.requiredTotal} required services connected`}>
          {setup.services.slice(0, 2).map((service) => (
            <span
              key={service.label}
              title={`${service.label}: ${service.ready ? "Connected" : "Not connected"}`}
              className={`h-1.5 flex-1 rounded-full ${service.ready ? "bg-[var(--success)]" : "bg-white/10"}`}
            />
          ))}
        </div>
      </Link>
    </aside>
  );
}

function isActiveNavItem(pathname: string, href: string) {
  if (href === "/video-editor") {
    return pathname === "/video-editor" || (pathname.startsWith("/projects/") && pathname.endsWith("/timeline"));
  }

  if (href === "/thumbnail-editor") {
    return pathname === "/thumbnail-editor" || (pathname.startsWith("/projects/") && pathname.endsWith("/thumbnail"));
  }

  if (href === "/projects") {
    return pathname === "/projects" || (pathname.startsWith("/projects/") && pathname !== "/projects/new");
  }

  if (href === "/projects/new") {
    return pathname === "/projects/new";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function TopBar({ pageTitle, setup, onOpenCommand }: { pageTitle: string; setup: SetupOverview; onOpenCommand: () => void }) {
  const [privateAccessEnabled, setPrivateAccessEnabled] = useState(false);
  useEffect(() => { fetch("/api/auth/status").then((response) => response.json()).then((body) => setPrivateAccessEnabled(body.enabled === true)).catch(() => undefined); }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <header className="studio-topbar relative z-50 flex h-[58px] shrink-0 items-center justify-between overflow-visible border-b border-[var(--border)] px-3 lg:h-[62px] lg:px-6">
      <motion.div key={pageTitle} aria-hidden="true" className="absolute bottom-[-1px] left-0 h-px bg-[var(--rose-soft)]" initial={{ width: "0%", opacity: 0.7 }} animate={{ width: "100%", opacity: 0 }} transition={{ duration: 0.42, ease: "easeOut" }} />
      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <Link href="/projects/new" className="hidden hover:text-white sm:block">
          Studio
        </Link>
        <span className="hidden sm:block">/</span>
        <span className="text-[var(--text-primary)]">{pageTitle}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-[rgba(143,195,177,.18)] bg-[rgba(143,195,177,.06)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--success)] md:flex"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-40" /><span className="relative h-1.5 w-1.5 rounded-full bg-[var(--success)]" /></span>Hosted studio</div>
        <button onClick={onOpenCommand} title="Open command palette" aria-label="Open command palette" className="glass-control grid h-9 w-9 place-items-center rounded-lg text-[var(--text-muted)] hover:text-white">
          <Search className="h-4 w-4" />
        </button>
        {privateAccessEnabled ? <button onClick={signOut} title="Sign out of private studio" aria-label="Sign out of private studio" className="glass-control grid h-9 w-9 place-items-center rounded-lg text-[var(--text-muted)] hover:text-white">
          <LogOut className="h-4 w-4" />
        </button> : null}
        {setup.canCreate ? (
          <Link href="/settings" className="glass-control flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-[var(--text-secondary)] transition hover:text-white">
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Setup</span>
          </Link>
        ) : null}
        <Link
          href={setup.canCreate ? "/projects/new" : "/settings"}
          title={setup.canCreate ? "Create a song or album." : "Connect OpenAI before creating media."}
          className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition ${
            setup.canCreate
              ? "glass-primary text-white"
              : "glass-control text-[var(--text-muted)]"
          }`}
        >
          {setup.canCreate ? <Plus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          <span className="hidden sm:inline">{setup.canCreate ? "New Media" : "Connect OpenAI"}</span>
        </Link>
      </div>
    </header>
  );
}

function FreshWorkspace({ pathname, setup }: { pathname: string; setup: SetupOverview }) {
  if (pathname.startsWith("/settings")) {
    return <SettingsWorkspace setup={setup} />;
  }

  if (pathname.startsWith("/projects/") && pathname.endsWith("/timeline")) {
    return <VideoTimelineWorkspace id={pathname.split("/").filter(Boolean)[1]} />;
  }

  if (pathname.startsWith("/projects/") && pathname.endsWith("/thumbnail")) {
    return <ThumbnailEditorWorkspace id={pathname.split("/").filter(Boolean)[1]} />;
  }

  if (pathname === "/video-editor") {
    return <VideoEditorWorkspace />;
  }

  if (pathname === "/thumbnail-editor") {
    return <ThumbnailEditorWorkspace />;
  }

  if (pathname.startsWith("/projects/") && pathname !== "/projects/new") {
    return <ProjectDetailWorkspace id={pathname.split("/").filter(Boolean)[1]} />;
  }

  if (pathname === "/projects") {
    return <ProjectsWorkspace />;
  }

  if (pathname === "/publishing") {
    return <PublishingWorkspace />;
  }

  if (pathname === "/analytics") {
    return <AnalyticsWorkspace />;
  }

  if (pathname === "/history") {
    return <HistoryWorkspaceScreen />;
  }

  return <ProjectsWorkspace />;
}

function ProjectsWorkspace() {
  const cached = peekCachedJson<{ projects: ClientProject[] }>("/api/projects");
  const [projects, setProjects] = useState<ClientProject[] | null>(cached?.projects ?? null);

  useEffect(() => {
    const load = () => cachedJson<{ projects: ClientProject[] }>("/api/projects")
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => setProjects([]));
    load();
    window.addEventListener("velvet:studio-update", load);
    return () => window.removeEventListener("velvet:studio-update", load);
  }, []);

  if (projects === null) {
    return (
      <div className="min-h-0 flex-1 overflow-hidden p-5" aria-label="Loading projects">
        <section className="panel h-full rounded-xl p-5">
          <div className="flex items-center justify-between">
            <SectionTitle label="Projects" />
            <div className="studio-skeleton h-10 w-28 rounded-lg" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 rounded-lg bg-white/[0.02] p-3 ring-1 ring-inset ring-[var(--border)]">
                <div className="studio-skeleton aspect-square rounded-lg" />
                <div className="min-w-0 py-1">
                  <div className="studio-skeleton h-3 w-20 rounded" />
                  <div className="studio-skeleton mt-4 h-4 w-3/4 rounded" />
                  <div className="studio-skeleton mt-3 h-3 w-full rounded" />
                  <div className="studio-skeleton mt-2 h-3 w-2/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (projects.length > 0) {
    return (
      <div className="min-h-0 flex-1 overflow-hidden p-5">
        <section className="panel h-full rounded-xl p-5">
          <div className="flex items-center justify-between">
            <SectionTitle label="Projects" />
            <Link href="/projects/new" className="flex h-10 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-4 text-sm font-medium">
              <Plus className="h-4 w-4" />
              New Media
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-3">
            {projects.slice(0, 6).map((project) => (
              <motion.div key={project.id} whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
                <Link href={`/projects/${project.id}`} className="group grid grid-cols-[92px_minmax(0,1fr)] gap-3 rounded-lg bg-white/[0.028] p-3 ring-1 ring-inset ring-[var(--border)] transition hover:bg-white/[0.045] hover:ring-[var(--border-hover)]">
                  <ProjectArtwork title={project.title} compact />
                  <div className="min-w-0 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--rose-soft)]">{project.mediaType ?? "album"}</span>
                      <StatusPill status={project.status} />
                    </div>
                    <h2 className="mt-2 line-clamp-2 text-base font-semibold leading-5 text-white">{project.title}</h2>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{project.brief}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 p-5">
      <section className="panel flex h-full flex-col items-center justify-center rounded-xl p-8 text-center">
        <div className="w-24 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <ProjectArtwork title="Your first Velvet release" compact />
        </div>
        <h1 className="mt-5 text-[30px] font-semibold leading-none">No projects yet</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
          Your songs and albums will live here after you create the first blueprint.
        </p>
        <Link href="/projects/new" className="mt-6 flex h-11 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 text-sm font-medium">
          <Plus className="h-4 w-4" />
          Create Media
        </Link>
      </section>
    </div>
  );
}

function VideoEditorWorkspace({ id }: { id?: string }) {
  const { projects, selectedId, setSelectedId, loading } = useToolProjects(id);

  if (loading) return <ToolLoading label="Loading video editor" />;

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      {projects.length ? <ProjectToolSwitcher title="Video Editor" body="Assemble artwork, ordered music, overlays, grain, flicker and render timing. Use a project timeline or drag files into a blank edit." projects={projects} selectedId={selectedId} onSelect={setSelectedId} /> : null}
      {selectedId ? <VideoTimelineWorkspace id={selectedId} /> : <BlankVideoEditorWorkspace />}
    </div>
  );
}

function BlankVideoEditorWorkspace() {
  return <SequenceDrawer standalone open onClose={() => { window.location.href = "/projects/new"; }} projectTitle="Untitled video edit" tracks={[]} artworkAssets={[]} />;
}

function VideoTimelineWorkspace({ id }: { id: string }) {
  const resourceKey = `/api/projects/${id}`;
  const cached = peekCachedJson<{ project?: ClientProject }>(resourceKey);
  const [project, setProject] = useState<ClientProject | null>(cached?.project ?? null);
  const [missing, setMissing] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const data = await cachedJson<{ project?: ClientProject }>(resourceKey, true);
      setProject(data.project ?? null);
      setMissing(false);
    } catch {
      setProject(null);
      setMissing(true);
    }
  }, [resourceKey]);

  useEffect(() => {
    loadProject();
    window.addEventListener("velvet:studio-update", loadProject);
    return () => window.removeEventListener("velvet:studio-update", loadProject);
  }, [loadProject]);

  async function saveTimeline(tracks: StudioTrack[], production: StudioProduction) {
    const response = await fetch(resourceKey, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tracks, production }) });
    if (!response.ok) return emitToast("Timeline changes could not be saved.", "error");
    emitToast("Video timeline saved.", "success");
    await loadProject();
  }

  if (missing) return <BlankVideoEditorWorkspace />;

  if (!project?.blueprint) {
    return <div className="grid min-h-0 flex-1 place-items-center p-4"><section className="panel grid h-full w-full place-items-center rounded-xl"><div className="text-center"><Activity className="mx-auto h-5 w-5 animate-pulse text-[var(--rose-soft)]" /><p className="mt-3 text-sm text-[var(--text-muted)]">Loading video timeline...</p></div></section></div>;
  }

  return <SequenceDrawer standalone open onClose={() => { window.location.href = `/projects/${id}`; }} projectId={id} projectTitle={project.title} tracks={project.blueprint.tracks} production={project.production} artworkAssets={(project.referenceAssets ?? []).filter((asset) => asset.kind === "artwork")} onSave={saveTimeline} onAssetUploaded={loadProject} />;
}

function ThumbnailEditorWorkspace({ id }: { id?: string }) {
  const { projects, selectedId, setSelectedId, loading } = useToolProjects(id);

  if (loading) return <ToolLoading label="Loading thumbnail editor" />;
  if (!projects.length) return <EmptyToolWorkspace title="No projects for the thumbnail editor yet" body="Create a blueprint first. The thumbnail editor will then generate release titles and artwork directions for that project." />;

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <ProjectToolSwitcher title="Thumbnail Editor" body="Generate title options and thumbnail directions, then apply the best creative direction back to the selected project." projects={projects} selectedId={selectedId} onSelect={setSelectedId} />
      {selectedId ? <ThumbnailEditorDetail id={selectedId} /> : null}
    </div>
  );
}

function ThumbnailEditorDetail({ id }: { id: string }) {
  const resourceKey = `/api/projects/${id}`;
  const cached = peekCachedJson<{ project?: ClientProject }>(resourceKey);
  const [project, setProject] = useState<ClientProject | null>(cached?.project ?? null);

  const loadProject = useCallback(async () => {
    const data = await cachedJson<{ project?: ClientProject }>(resourceKey, true);
    setProject(data.project ?? null);
  }, [resourceKey]);

  useEffect(() => {
    loadProject().catch(() => setProject(null));
    window.addEventListener("velvet:studio-update", loadProject);
    return () => window.removeEventListener("velvet:studio-update", loadProject);
  }, [loadProject]);

  async function applyCreativeVariant(field: "youtubeTitle" | "coverPrompt", value: string) {
    const response = await fetch(resourceKey, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    if (!response.ok) return emitToast("Creative direction could not be applied.", "error");
    emitToast(field === "youtubeTitle" ? "Title applied." : "Thumbnail direction applied.", "success");
    await loadProject();
  }

  if (!project?.blueprint) {
    return <ToolLoading label="Loading thumbnail editor" />;
  }

  return <CreativeVariantsDrawer standalone open onClose={() => { window.location.href = `/projects/${id}`; }} projectId={id} projectTitle={project.title} variants={project.creativeVariants} onUseTitle={(title) => applyCreativeVariant("youtubeTitle", title)} onUseThumbnail={(prompt) => applyCreativeVariant("coverPrompt", prompt)} onRefresh={loadProject} />;
}

function useToolProjects(forcedId?: string) {
  const cached = peekCachedJson<{ projects: ClientProject[] }>("/api/projects");
  const [projects, setProjects] = useState<ClientProject[] | null>(cached?.projects?.filter((project) => project.blueprint) ?? null);
  const [selectedId, setSelectedId] = useState(forcedId ?? "");

  useEffect(() => {
    const load = () => cachedJson<{ projects: ClientProject[] }>("/api/projects", true)
      .then((data) => setProjects((data.projects ?? []).filter((project) => project.blueprint)))
      .catch(() => setProjects([]));
    load();
    window.addEventListener("velvet:studio-update", load);
    return () => window.removeEventListener("velvet:studio-update", load);
  }, []);

  useEffect(() => {
    if (forcedId) {
      setSelectedId(forcedId);
      return;
    }
    if (selectedId && projects && !projects.some((project) => project.id === selectedId)) {
      setSelectedId(projects[0]?.id ?? "");
      return;
    }
    if (!selectedId && projects?.[0]) setSelectedId(projects[0].id);
  }, [forcedId, projects, selectedId]);

  return { projects: projects ?? [], selectedId, setSelectedId, loading: projects === null };
}

function ProjectToolSwitcher({ title, body, projects, selectedId, onSelect }: { title: string; body: string; projects: ClientProject[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="shrink-0 px-3 pt-3 lg:px-4 lg:pt-4">
      <section className="panel rounded-xl p-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <SectionTitle label={title} />
            <p className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">{body}</p>
          </div>
          <Link href="/projects/new" className="hidden h-9 items-center gap-2 rounded-lg bg-white/[0.045] px-3 text-xs text-[var(--text-secondary)] hover:bg-white/[0.075] hover:text-white md:flex">
            <Plus className="h-3.5 w-3.5" />
            New Media
          </Link>
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden">
          {projects.slice(0, 5).map((project) => (
            <button key={project.id} onClick={() => onSelect(project.id)} className={`grid min-w-0 flex-1 grid-cols-[36px_minmax(0,1fr)] items-center gap-2 rounded-lg border p-2 text-left ${selectedId === project.id ? "border-[var(--border-active)] bg-[rgba(239,99,152,.09)]" : "border-[var(--border)] bg-white/[.025] hover:border-[var(--border-hover)]"}`}>
              <ProjectArtwork title={project.title} compact />
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-white">{project.title}</span>
                <span className="mt-0.5 block truncate text-[10px] text-[var(--text-muted)]">{project.mediaType ?? "release"} · {project.status}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ToolLoading({ label }: { label: string }) {
  return <div className="grid min-h-0 flex-1 place-items-center p-4" aria-label={label}><section className="panel grid h-full w-full place-items-center rounded-xl"><div className="text-center"><Activity className="mx-auto h-5 w-5 animate-pulse text-[var(--rose-soft)]" /><p className="mt-3 text-sm text-[var(--text-muted)]">{label}...</p></div></section></div>;
}

function EmptyToolWorkspace({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-0 flex-1 p-5">
      <section className="panel flex h-full flex-col items-center justify-center rounded-xl p-8 text-center">
        <ImageIcon className="h-8 w-8 text-[var(--rose-soft)]" />
        <h1 className="mt-4 text-[28px] font-semibold">{title}</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
        <Link href="/projects/new" className="mt-6 flex h-11 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 text-sm font-medium">
          <Plus className="h-4 w-4" />
          Create Media
        </Link>
      </section>
    </div>
  );
}

function ProjectDetailWorkspace({ id }: { id: string }) {
  const setup = useSetupOverview();
  const resourceKey = `/api/projects/${id}`;
  const cached = peekCachedJson<{ project?: ClientProject; jobs?: ClientJob[]; usage?: ClientUsage[] }>(resourceKey);
  const [project, setProject] = useState<ClientProject | null>(cached?.project ?? null);
  const [jobs, setJobs] = useState<ClientJob[]>(cached?.jobs ?? []);
  const [usage, setUsage] = useState<ClientUsage[]>(cached?.usage ?? []);
  const [message, setMessage] = useState("Review the blueprint before running paid generation.");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"release" | "jobs" | "usage">("release");
  const [saveState, setSaveState] = useState("Saved");
  const [editRevision, setEditRevision] = useState(0);
  const [privacy, setPrivacy] = useState<"private" | "unlisted" | "public">("private");
  const [auditionTrack, setAuditionTrack] = useState<StudioTrack | null>(null);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [creativeOpen, setCreativeOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [generationRate, setGenerationRate] = useState<number | null>(null);
  const { activeTrack, loadTrack, togglePlaying } = usePlayerStore();
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
    const data = await cachedJson<{ project?: ClientProject; jobs?: ClientJob[]; usage?: ClientUsage[] }>(resourceKey, true);
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
  }, [resourceKey]);

  useEffect(() => {
    loadProject().catch(() => setMessage("Project could not be loaded."));
    window.addEventListener("velvet:studio-update", loadProject);
    return () => window.removeEventListener("velvet:studio-update", loadProject);
  }, [loadProject]);

  useEffect(() => {
    fetch("/api/setup").then((response) => response.json()).then((data) => setGenerationRate(data.setup?.pricing?.elevenLabsPerMinute ?? null)).catch(() => setGenerationRate(null));
  }, []);

  useEffect(() => {
    if (!isEditing || editRevision === 0) return;
    setSaveState("Saving");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm)
        });
        setSaveState(response.ok ? "Saved" : "Needs attention");
      } catch {
        setSaveState("Needs attention");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [editForm, editRevision, id, isEditing]);

  function updateProjectEdit(field: keyof typeof editForm, value: string) {
    setEditForm((current) => ({ ...current, [field]: value }));
    setSaveState("Unsaved");
    setEditRevision((current) => current + 1);
  }

  async function runAction(action: "approve" | "music" | "render" | "upload") {
    setBusyAction(action);
    setMessage(`${actionLabel(action)}...`);

    try {
      const response = await fetch(action === "approve" ? `/api/projects/${id}/approve` : "/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "approve" ? { projectId: id } : { projectId: id, type: queuedJobType(action), payload: { privacy, scheduledPublishAt: project?.production?.scheduledPublishAt } })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? `${actionLabel(action)} failed.`);
      }

      setMessage(data.message ?? `${actionLabel(action)} complete.`);
      emitToast(data.message ?? `${actionLabel(action)} complete.`, "success");
      await loadProject();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${actionLabel(action)} failed.`);
      emitToast(error instanceof Error ? error.message : `${actionLabel(action)} failed.`, "error");
      await loadProject().catch(() => undefined);
    } finally {
      setBusyAction(null);
    }
  }

  async function applyTrackPrompt(prompt: string) {
    if (!project?.blueprint || !auditionTrack) return;
    const tracks = project.blueprint.tracks.map((track) => track.title === auditionTrack.title ? { ...track, prompt } : track);
    const response = await fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tracks }) });
    if (!response.ok) return emitToast("Prompt could not be applied.", "error");
    emitToast("Track prompt updated.", "success");
    await loadProject();
  }

  async function duplicateProject() {
    const response = await fetch(`/api/projects/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "duplicate" }) });
    const data = await response.json();
    if (!response.ok) return emitToast(data.error ?? "Project could not be duplicated.", "error");
    emitToast("Project duplicated.", "success");
    window.location.href = `/projects/${data.project.id}`;
  }

  async function applyCreativeVariant(field: "youtubeTitle" | "coverPrompt", value: string) {
    const response = await fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    if (!response.ok) return emitToast("Creative direction could not be applied.", "error");
    emitToast(field === "youtubeTitle" ? "YouTube title applied." : "Thumbnail direction applied.", "success");
    await loadProject();
  }

  async function saveProjectEdits() {
    setBusyAction("save");
    setSaveState("Saving");
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
      setSaveState("Saved");
      setMessage("Project edits saved.");
      await loadProject();
    } catch (error) {
      setSaveState("Needs attention");
      setMessage(error instanceof Error ? error.message : "Project edits could not be saved.");
    } finally {
      setBusyAction(null);
    }
  }

  if (!project) {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-4 xl:grid-cols-[236px_minmax(0,1fr)_300px]" aria-label="Loading studio">
        <section className="panel hidden rounded-xl p-3 xl:block"><div className="studio-skeleton aspect-square rounded-xl" /><div className="studio-skeleton mt-4 h-5 w-2/3 rounded" /><div className="studio-skeleton mt-3 h-3 w-full rounded" /></section>
        <section className="panel rounded-xl p-4"><div className="studio-skeleton h-5 w-32 rounded" /><div className="mt-8 grid gap-2">{[1,2,3,4,5].map((item) => <div key={item} className="studio-skeleton h-14 rounded-lg" />)}</div><span className="sr-only">{message}</span></section>
        <section className="panel hidden rounded-xl p-3 xl:block"><div className="studio-skeleton h-9 rounded-lg" /><div className="studio-skeleton mt-4 h-24 rounded-lg" /><div className="studio-skeleton mt-3 h-24 rounded-lg" /></section>
      </div>
    );
  }
  const nextStep = projectNextStep(project, setup);

  return (
    <div className={`grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:p-4 ${focusMode ? "xl:grid-cols-1" : "xl:grid-cols-[236px_minmax(0,1fr)_300px]"}`}>
      <aside className={`panel hidden min-h-0 rounded-xl p-3 ${focusMode ? "xl:hidden" : "xl:block"}`}>
        <ProjectArtwork title={project.title} />
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--rose-soft)]">{project.mediaType ?? "album"}</span>
          <StatusPill status={project.status} />
        </div>
        <h1 className="mt-3 line-clamp-2 text-xl font-semibold leading-6 text-white">{project.title}</h1>
        <p className="mt-3 line-clamp-4 text-xs leading-5 text-[var(--text-secondary)]">{project.blueprint?.concept ?? project.brief}</p>
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-[var(--border)]">
          <StudioMetric label="Tracks" value={String(project.blueprint?.tracks.length ?? 0)} />
          <StudioMetric label="Length" value={formatDuration((project.blueprint?.tracks ?? []).reduce((total, track) => total + track.durationSeconds, 0))} />
        </div>
      </aside>

      <section className="panel min-h-0 overflow-hidden rounded-xl p-4">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <SectionTitle label="Production" icon={<ListMusic className="h-4 w-4" />} />
            <div className="mt-2 xl:hidden"><StatusPill status={project.status} /></div>
            <h1 className="mt-2 line-clamp-1 text-2xl font-semibold leading-none xl:hidden">{project.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Save className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <span className="text-[11px] text-[var(--text-muted)]">{saveState}</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <WorkflowButton icon={<Check className="h-4 w-4" />} label="Approve" active={busyAction === "approve"} onClick={() => runAction("approve")} disabled={project.status !== "blueprint"} />
          <WorkflowButton icon={<WandSparkles className="h-4 w-4" />} label="Generate" active={busyAction === "music"} onClick={() => runAction("music")} disabled={!setup.canGenerate || !["approved", "generating"].includes(project.status)} />
          <WorkflowButton icon={<Clapperboard className="h-4 w-4" />} label="Render" active={busyAction === "render"} onClick={() => runAction("render")} disabled={!project.generatedTracks?.length || ["rendering", "uploading", "uploaded"].includes(project.status)} />
          <WorkflowButton icon={<Upload className="h-4 w-4" />} label="Upload" active={busyAction === "upload"} onClick={() => runAction("upload")} disabled={!setup.canPublish || !(project.render?.videoPath || project.render?.videoStoragePath) || ["uploading", "uploaded"].includes(project.status)} />
        </div>

        <div className="mt-3 overflow-hidden rounded-lg bg-black/15 ring-1 ring-inset ring-[var(--border)]">
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-[var(--text-secondary)]">
            <span className="truncate">{message}</span>
            <span className="tabular text-[var(--text-muted)]">{workflowProgress(project.status)}%</span>
          </div>
          <motion.div className="h-0.5 bg-[linear-gradient(90deg,var(--cyan),var(--violet),var(--rose))]" initial={false} animate={{ width: `${workflowProgress(project.status)}%` }} transition={{ type: "spring", stiffness: 120, damping: 22 }} />
        </div>

        <div className="mt-3 rounded-xl border border-[var(--border)] bg-white/[0.025] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--rose-soft)]">Next step</div>
              <p className="mt-1 truncate text-sm font-medium text-white">{nextStep.title}</p>
              <p className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">{nextStep.body}</p>
            </div>
            {nextStep.action ? (
              <button aria-label="Continue workflow" onClick={() => runAction(nextStep.action!)} disabled={Boolean(nextStep.disabled) || busyAction === nextStep.action} className="glass-primary flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40">
                {busyAction === nextStep.action ? "Working" : nextStep.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <Link aria-label="Continue workflow" href={nextStep.href ?? "/projects/new"} className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-white/[0.045] px-4 text-xs text-[var(--text-secondary)] hover:bg-white/[0.075] hover:text-white">
                {nextStep.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        <ExportShelf project={project} setup={setup} onUpload={() => runAction("upload")} uploadBusy={busyAction === "upload"} />

        <div className="mt-4 grid grid-cols-1 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3"><SectionTitle label="Tracks & Prompts" icon={<Music2 className="h-4 w-4" />} /><div className="flex items-center gap-1"><button onClick={() => setFocusMode((current) => !current)} title={focusMode ? "Exit focus mode" : "Focus studio"} aria-label={focusMode ? "Exit focus mode" : "Focus studio"} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-white/[.05] hover:text-white"><Focus className="h-3.5 w-3.5" /></button><Link href={`/projects/${id}/timeline`} title="Open video timeline" aria-label="Open video timeline" className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-white/[.05] hover:text-white"><SlidersHorizontal className="h-3.5 w-3.5" /></Link><button onClick={() => setGenerationOpen(true)} title="Open generation center" aria-label="Open generation center" className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-white/[.05] hover:text-white"><ListRestart className="h-3.5 w-3.5" /></button><span className="ml-1 text-[11px] text-[var(--text-muted)]">{project.generatedTracks?.length ?? 0} generated</span></div></div>
            <div className="grid max-h-[410px] gap-2 overflow-hidden">
              {(project.blueprint?.tracks ?? []).slice(0, 6).map((track, index) => {
                const generated = project.generatedTracks?.[index];
                const isCurrent = activeTrack?.title === track.title && activeTrack.projectTitle === project.title;
                return (
                  <motion.article key={track.title} layout onContextMenu={(event) => { event.preventDefault(); setAuditionTrack(track); }} className={`studio-track-row grid grid-cols-[36px_30px_minmax(0,1fr)_54px] items-center gap-2 rounded-lg px-2 py-2 ring-1 ring-inset transition ${isCurrent ? "bg-[rgba(239,99,152,0.085)] ring-[rgba(239,99,152,0.24)]" : "bg-white/[0.025] ring-[var(--border)] hover:bg-white/[0.04]"}`}>
                    <button aria-label={generated ? `Play ${track.title}` : `${track.title} is not generated yet`} title={generated ? `Play ${track.title}` : "Generate this track before playback"} disabled={!generated} onClick={() => { if (!isCurrent) loadTrack({ title: track.title, projectTitle: project.title, durationSeconds: track.durationSeconds, artworkTitle: project.title, version: generated?.version, sourceUrl: `/api/audio?projectId=${encodeURIComponent(id)}&trackId=${encodeURIComponent(generated?.id ?? "")}&title=${encodeURIComponent(track.title)}` }); togglePlaying(); }} className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.045] text-[var(--text-secondary)] hover:bg-[rgba(239,99,152,0.14)] hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </button>
                    <span className="tabular text-xs text-[var(--text-muted)]">{String(index + 1).padStart(2, "0")}</span>
                    <button onClick={() => setAuditionTrack(track)} className="min-w-0 text-left"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-medium text-white">{track.title}</h2>{generated?.approvedAt ? <Check className="h-3 w-3 shrink-0 text-[var(--success)]" /> : null}<span className="hidden rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-[var(--text-muted)] 2xl:inline">{track.mood}</span></div><p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">{track.prompt}</p></button>
                    <span className="tabular text-right text-xs text-[var(--text-muted)]">{formatDuration(track.durationSeconds)}</span>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <aside className={`panel hidden min-h-0 overflow-hidden rounded-xl p-3 ${focusMode ? "xl:hidden" : "xl:block"}`}>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle label="Inspector" icon={<PanelRight className="h-4 w-4" />} />
          <button onClick={() => (isEditing ? saveProjectEdits() : setIsEditing(true))} disabled={!project.blueprint || busyAction === "save"} className="h-8 rounded-lg bg-white/[0.05] px-3 text-xs text-[var(--text-secondary)] hover:bg-white/[0.08] hover:text-white disabled:opacity-40">{isEditing ? "Done" : "Edit"}</button>
        </div>
        <div className="mt-3 grid h-9 grid-cols-3 rounded-lg bg-black/20 p-1">
          {(["release", "jobs", "usage"] as const).map((tab) => (
            <button key={tab} onClick={() => setInspectorTab(tab)} className={`rounded-md text-[11px] font-medium capitalize ${inspectorTab === tab ? "bg-white/[0.08] text-white" : "text-[var(--text-muted)] hover:text-white"}`}>{tab}</button>
          ))}
        </div>

        {inspectorTab === "release" ? (
          <div className="mt-3 space-y-2 overflow-hidden">
            {isEditing ? (
              <>
                <EditField label="Title" value={editForm.title} onChange={(value) => updateProjectEdit("title", value)} />
                <EditArea label="Concept" value={editForm.concept} onChange={(value) => updateProjectEdit("concept", value)} />
                <EditArea label="Cover prompt" value={editForm.coverPrompt} onChange={(value) => updateProjectEdit("coverPrompt", value)} />
                <EditArea label="Video prompt" value={editForm.videoPrompt} onChange={(value) => updateProjectEdit("videoPrompt", value)} />
                <EditField label="YouTube title" value={editForm.youtubeTitle} onChange={(value) => updateProjectEdit("youtubeTitle", value)} />
              </>
            ) : (
              <>
                <InspectorField label="Cover direction" value={project.blueprint?.coverPrompt ?? "Waiting for blueprint"} />
                <InspectorField label="Video direction" value={project.blueprint?.videoPrompt ?? "Waiting for blueprint"} />
                <InspectorField label="YouTube title" value={project.blueprint?.youtube.title ?? "Waiting for blueprint"} />
                <InspectorField label="Render" value={project.render?.message ?? "Not rendered yet"} />
              </>
            )}
            <PrivacyMenu value={privacy} onChange={setPrivacy} />
            <div className="grid grid-cols-3 gap-2 pt-1"><ReferenceUploader projectId={id} onUploaded={loadProject} /><Link href={`/projects/${id}/thumbnail`} title="Open thumbnail editor" aria-label="Open thumbnail editor" className="flex h-9 items-center justify-center gap-2 rounded-lg bg-white/[.04] px-2 text-xs text-[var(--text-secondary)] hover:bg-white/[.07] hover:text-white"><ImageIcon className="h-3.5 w-3.5" />Thumbnail</Link><a href={`/api/projects/${id}/archive`} title="Download project archive" className="flex h-9 items-center justify-center gap-2 rounded-lg bg-white/[.04] px-2 text-xs text-[var(--text-secondary)] hover:bg-white/[.07] hover:text-white"><Download className="h-3.5 w-3.5" />Archive</a></div>
            <button onClick={duplicateProject} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-white/[.04] text-xs text-[var(--text-secondary)] hover:bg-white/[.07] hover:text-white"><ListRestart className="h-3.5 w-3.5" />Duplicate project</button>
          </div>
        ) : null}

        <aside className={`${inspectorTab === "jobs" ? "block" : "hidden"} mt-3 rounded-lg p-1`}>
          <SectionTitle label="Job Queue" />
          <div className="mt-3 space-y-2">
            {(jobs.length ? jobs : [{ id: "empty", type: "ready", status: "idle", message: "No project jobs yet." }]).slice(0, 4).map((job) => (
              <div key={job.id} className="rounded-lg bg-white/[0.025] p-3 ring-1 ring-inset ring-[var(--border)]">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-white">{job.type}</span>
                  <StatusPill status={job.status} />
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{job.message}</p>
              </div>
            ))}
          </div>
        </aside>
        <aside className={`${inspectorTab === "usage" ? "block" : "hidden"} mt-3 rounded-lg p-1`}>
          <SectionTitle label="Usage" />
          <div className="mt-3 space-y-2">
            {(usage.length ? usage : [{ id: "empty", provider: "ready", operation: "No usage recorded yet.", units: {} }]).slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-lg bg-white/[0.025] p-3 text-xs text-[var(--text-secondary)] ring-1 ring-inset ring-[var(--border)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="uppercase tracking-[0.12em] text-[var(--rose-soft)]">{item.provider}</div>
                  {item.costStatus ? <div className="text-[var(--text-muted)]">{formatCost(item)}</div> : null}
                </div>
                <div className="mt-1">{item.operation}</div>
              </div>
            ))}
          </div>
        </aside>
      </aside>
      <TrackAuditionDrawer open={Boolean(auditionTrack)} onClose={() => setAuditionTrack(null)} projectId={id} projectTitle={project.title} track={auditionTrack} versions={auditionTrack ? project.trackVersions?.[auditionTrack.title] ?? (project.generatedTracks?.filter((item) => item.title === auditionTrack.title) ?? []) : []} selectedVersion={auditionTrack ? project.generatedTracks?.find((item) => item.title === auditionTrack.title) : undefined} onRefresh={loadProject} onApplyPrompt={applyTrackPrompt} />
      <GenerationDrawer open={generationOpen} onClose={() => setGenerationOpen(false)} jobs={jobs} services={setup.services} estimatedCost={generationRate === null ? null : generationRate * ((project.blueprint?.tracks.reduce((sum, track) => sum + track.durationSeconds, 0) ?? 0) / 60)} onRefresh={loadProject} />
      <CreativeVariantsDrawer open={creativeOpen} onClose={() => setCreativeOpen(false)} projectId={id} variants={project.creativeVariants} onUseTitle={(title) => applyCreativeVariant("youtubeTitle", title)} onUseThumbnail={(prompt) => applyCreativeVariant("coverPrompt", prompt)} onRefresh={loadProject} />
    </div>
  );
}

function WorkflowButton({
  icon,
  label,
  active,
  disabled,
  onClick
}: {
  icon?: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || active}
      title={label}
      className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg bg-white/[0.045] px-2 text-xs text-[var(--text-secondary)] ring-1 ring-inset ring-[var(--border)] hover:bg-white/[0.075] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
    >
      {active ? <Activity className="h-4 w-4 animate-pulse" /> : icon}
      <span className="hidden truncate 2xl:inline">{active ? "Working" : label}</span>
    </button>
  );
}

function StudioMetric({ label, value }: { label: string; value: string }) {
  return <div className="bg-[#111426] px-3 py-2.5"><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</div><div className="mt-1 tabular text-sm text-white">{value}</div></div>;
}

function InspectorField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/[0.025] p-3 ring-1 ring-inset ring-[var(--border)]"><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--rose-soft)]">{label}</div><p className="mt-2 line-clamp-3 text-[11px] leading-4 text-[var(--text-secondary)]">{value}</p></div>;
}

const privacyOptions = [
  { value: "private" as const, label: "Private", detail: "Only you", icon: Lock },
  { value: "unlisted" as const, label: "Unlisted", detail: "Anyone with the link", icon: Link2 },
  { value: "public" as const, label: "Public", detail: "Visible to everyone", icon: Globe2 }
];

function PrivacyMenu({ value, onChange }: { value: "private" | "unlisted" | "public"; onChange: (value: "private" | "unlisted" | "public") => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = privacyOptions.find((option) => option.value === value) ?? privacyOptions[0];
  const SelectedIcon = selected.icon;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative pt-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Upload privacy</div>
      <button type="button" aria-label="Privacy" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={`mt-1.5 flex h-10 w-full items-center gap-2.5 rounded-lg bg-black/20 px-3 text-left ring-1 ring-inset transition ${open ? "ring-[var(--border-active)]" : "ring-[var(--border)] hover:ring-[var(--border-hover)]"}`}>
        <SelectedIcon className="h-3.5 w-3.5 shrink-0 text-[var(--rose-soft)]" />
        <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-white">{selected.label}</span><span className="mt-0.5 block truncate text-[9px] text-[var(--text-muted)]">{selected.detail}</span></span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.16 }}><ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" /></motion.span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div role="listbox" aria-label="Upload privacy options" initial={{ opacity: 0, y: 5, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.99 }} transition={{ duration: 0.15, ease: "easeOut" }} className="panel absolute inset-x-0 bottom-full z-40 mb-1 overflow-hidden rounded-lg bg-[#111426] p-1 shadow-[0_18px_50px_rgba(0,0,0,.45)]">
            {privacyOptions.map((option) => {
              const OptionIcon = option.icon;
              const active = option.value === value;
              return (
                <button key={option.value} role="option" aria-selected={active} onClick={() => { onChange(option.value); setOpen(false); }} className={`flex h-11 w-full items-center gap-3 rounded-md px-2.5 text-left ${active ? "bg-[rgba(239,99,152,.12)] text-white" : "text-[var(--text-secondary)] hover:bg-white/[.055] hover:text-white"}`}>
                  <OptionIcon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-[var(--rose-soft)]" : "text-[var(--text-muted)]"}`} />
                  <span className="min-w-0 flex-1"><span className="block text-xs font-medium">{option.label}</span><span className="mt-0.5 block text-[9px] text-[var(--text-muted)]">{option.detail}</span></span>
                  {active ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ExportShelf({ project, setup, onUpload, uploadBusy }: { project: ClientProject; setup: SetupOverview; onUpload: () => void; uploadBusy: boolean }) {
  const hasVideo = Boolean(project.render?.videoPath || project.render?.videoStoragePath);
  const exportLabel = (project.production?.exportFormat ?? "mp4").toUpperCase();
  return (
    <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-[var(--border)] bg-black/[0.12] p-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Export package</div>
        <p className="mt-1 truncate text-sm text-white">{hasVideo ? `Rendered ${exportLabel} and project archive are ready for manual publishing.` : "Render the release to unlock the video export."}</p>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <a href={`/api/projects/${project.id}/video`} download aria-disabled={!hasVideo} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium ${hasVideo ? "bg-white/[0.07] text-white hover:bg-white/[0.1]" : "pointer-events-none bg-white/[0.035] text-[var(--text-muted)] opacity-45"}`}><Download className="h-3.5 w-3.5" />Download {exportLabel}</a>
        <a href={`/api/projects/${project.id}/archive`} download className="flex h-9 items-center gap-2 rounded-lg bg-white/[0.045] px-3 text-xs text-[var(--text-secondary)] hover:bg-white/[0.075] hover:text-white"><FileText className="h-3.5 w-3.5" />Download archive</a>
        {setup.canPublish ? <button onClick={onUpload} disabled={!hasVideo || uploadBusy || ["uploading", "uploaded"].includes(project.status)} className="flex h-9 items-center gap-2 rounded-lg bg-[rgba(226,102,174,.08)] px-3 text-xs text-[var(--rose-soft)] hover:bg-[rgba(226,102,174,.14)] disabled:cursor-not-allowed disabled:opacity-40"><Upload className="h-3.5 w-3.5" />{uploadBusy ? "Uploading" : "YouTube"}</button> : null}
      </div>
    </div>
  );
}

type WorkflowAction = "approve" | "music" | "render" | "upload";

function projectNextStep(project: ClientProject, setup: SetupOverview): { title: string; body: string; cta: string; action?: WorkflowAction; href?: string; disabled?: boolean } {
  const generatedCount = project.generatedTracks?.length ?? 0;
  const trackCount = project.blueprint?.tracks.length ?? 0;
  if (project.status === "blueprint") {
    return { title: "Approve the blueprint", body: "Review the track prompts and metadata, then approve before any paid music generation.", cta: "Approve", action: "approve" };
  }
  if (project.status === "approved") {
    return setup.canGenerate
      ? { title: "Generate the music", body: "ElevenLabs will create the approved track prompts. You can review versions before rendering.", cta: "Generate", action: "music" }
      : { title: "Connect ElevenLabs", body: "Blueprint is approved. Add ElevenLabs in Settings before music generation.", cta: "Settings", href: "/settings" };
  }
  if (project.status === "generating") {
    return { title: "Generation is underway", body: `${generatedCount} of ${trackCount || "the"} tracks are ready. Velvet will update this project as jobs finish.`, cta: "Jobs", href: `/projects/${project.id}` };
  }
  if (project.status === "generated") {
    return { title: "Render the release video", body: "Combine approved audio, artwork, and visual filters into one export-ready video.", cta: "Render", action: "render", disabled: generatedCount === 0 };
  }
  if (project.status === "rendering") {
    return { title: "Render is underway", body: "Velvet is preparing the video package. The render and archive links will appear when ready.", cta: "Timeline", href: `/projects/${project.id}/timeline` };
  }
  if (project.status === "rendered") {
    return { title: "Export is ready", body: setup.canPublish ? "Download the video now, or send it to YouTube when you are ready." : "YouTube is optional. Download the video and archive for manual publishing.", cta: "Download video", href: `/api/projects/${project.id}/video` };
  }
  if (project.status === "uploading") {
    return { title: "Upload is underway", body: "Velvet is sending the rendered video and metadata to YouTube.", cta: "Publishing", href: "/publishing" };
  }
  if (project.status === "uploaded") {
    return { title: "Release complete", body: "This upload is recorded in History with the prompts, render settings, and result.", cta: "History", href: "/history" };
  }
  if (project.status === "failed") {
    return { title: "Needs attention", body: "Open the job queue for the failure details, then retry the blocked stage.", cta: "Jobs", href: `/projects/${project.id}` };
  }
  return { title: "Review the release", body: "Check the track prompts, metadata, artwork direction, and production settings.", cta: "Edit", href: `/projects/${project.id}` };
}

function workflowProgress(status: string) {
  return { draft: 8, blueprint: 24, approved: 42, generating: 58, generated: 70, rendering: 82, rendered: 90, uploading: 96, uploaded: 100 }[status.toLowerCase()] ?? 12;
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

function queuedJobType(action: "approve" | "music" | "render" | "upload") {
  return {
    approve: "blueprint",
    music: "music",
    render: "render",
    upload: "youtube-upload"
  }[action];
}

function formatCost(usage: ClientUsage) {
  if (usage.costStatus === "estimated" && typeof usage.estimatedCostUsd === "number") {
    return `$${usage.estimatedCostUsd.toFixed(4)}`;
  }

  return "Rate not set";
}

// Kept as a compact fallback while the active History screen is loaded in its own bundle.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    <div className="min-h-0 flex-1 overflow-hidden p-3 lg:p-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-5">
        <section className="panel rounded-xl p-5">
          <SectionTitle label="Upload History" />
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Every uploaded release will be logged here with the exact prompts, render settings, privacy choice, YouTube link and upload result.
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
                <div className="w-20 shadow-[0_16px_40px_rgba(0,0,0,0.28)]"><ProjectArtwork title="Velvet archive" compact /></div>
                <h1 className="mt-4 text-[28px] font-semibold leading-none">No uploads yet</h1>
                <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                  After a release is uploaded to YouTube, this log will show the upload record and open a complete prompt archive.
                </p>
                <Link href="/projects/new" className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.05] px-4 text-sm text-[var(--text-secondary)]">
                  Create first release
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>

        <aside className="hidden space-y-4 xl:block">
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

function FirstRunOnboarding({ open, setup, onDismiss }: { open: boolean; setup: SetupOverview; onDismiss: (completed?: boolean) => void }) {
  const [step, setStep] = useState(0);
  const [openaiKey, setOpenaiKey] = useState("");
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [youtubeLoginAvailable, setYoutubeLoginAvailable] = useState(false);
  const [completed, setCompleted] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Connect each service once. You can replace credentials later in Settings.");
  const youtubeWait = useRef<AbortController | undefined>(undefined);

  function finishLater() {
    youtubeWait.current?.abort();
    setBusy(false);
    onDismiss(false);
  }

  useEffect(() => () => youtubeWait.current?.abort(), []);

  useEffect(() => {
    if (!open) return;
    const ready: [boolean, boolean, boolean] = [
      Boolean(setup.services[0]?.ready),
      Boolean(setup.services[1]?.ready),
      Boolean(setup.services[2]?.ready)
    ];
    setCompleted(ready);
    setStep(ready[0] ? 1 : 0);
    fetch("/api/setup", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setYoutubeLoginAvailable(Boolean(data.secrets?.youtubeOAuth)))
      .catch(() => setYoutubeLoginAvailable(false));
  }, [open, setup.services]);

  async function saveProvider(provider: "openai" | "elevenlabs") {
    const index = provider === "openai" ? 0 : 1;
    const key = provider === "openai" ? openaiKey : elevenLabsKey;
    if (completed[index] && !key.trim()) {
      setStep(index + 1);
      return;
    }
    if (!key.trim()) {
      setMessage(`Enter your ${provider === "openai" ? "OpenAI" : "ElevenLabs"} API key to continue.`);
      return;
    }

    setBusy(true);
    setMessage(`Saving and checking ${provider === "openai" ? "OpenAI" : "ElevenLabs"}...`);
    try {
      const data = await saveAndValidateSetup(provider === "openai" ? { openaiApiKey: key } : { elevenLabsApiKey: key }, [provider]);
      const providerStatus = data.validation?.[provider];
      if (providerStatus?.state !== "valid") throw new Error(providerStatus?.message ?? "That API key could not be verified.");

      setCompleted((current) => current.map((value, currentIndex) => currentIndex === index ? true : value) as [boolean, boolean, boolean]);
      if (provider === "openai") setOpenaiKey("");
      else setElevenLabsKey("");
      if (provider === "elevenlabs") {
        setMessage("OpenAI and ElevenLabs are connected. You can create music now. YouTube is optional for publishing later.");
      } else {
        setMessage("OpenAI is connected and saved in Settings.");
        setStep(1);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The API key could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  async function connectYouTubeAccount() {
    if (completed[2]) {
      onDismiss(true);
      return;
    }
    setBusy(true);
    if (!youtubeLoginAvailable) {
      if (!googleClientId.trim()) {
        setBusy(false);
        setMessage("Add the Google OAuth client ID below, then select Log in with YouTube.");
        return;
      }

      setMessage("Saving the encrypted Google connection...");
      try {
        await configureYouTubeOAuth(googleClientId, googleClientSecret);
        setYoutubeLoginAvailable(true);
        setGoogleClientId("");
        setGoogleClientSecret("");
      } catch (error) {
        setBusy(false);
        setMessage(error instanceof Error ? error.message : "Google sign-in could not be configured.");
        return;
      }
    }

    setMessage("Finish signing in with your Google account. Velvet will connect automatically.");
    window.open("/api/youtube/login", "_blank", "noopener,noreferrer");

    const controller = new AbortController();
    youtubeWait.current?.abort();
    youtubeWait.current = controller;
    try {
      const data = await waitForYouTubeConnection(180_000, controller.signal);
      setCompleted((current) => [current[0], current[1], true]);
      setMessage(data.setup?.youtube?.status?.message ?? "YouTube connected successfully.");
      setBusy(false);
      onDismiss(true);
    } catch (error) {
      if (controller.signal.aborted) return;
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "YouTube sign-in was not completed.");
    }
  }

  const steps = [
    { label: "OpenAI", detail: "Planning and artwork" },
    { label: "ElevenLabs", detail: "Music generation" },
    { label: "YouTube", detail: "Optional publishing" }
  ];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[180] grid place-items-center bg-[rgba(5,4,10,0.68)] p-5 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section role="dialog" aria-modal="true" aria-labelledby="first-run-title" className="prompt-producer-dialog panel w-full max-w-[760px] overflow-visible rounded-lg p-5" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.99 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <header className="flex items-start justify-between gap-5 border-b border-[var(--border)] pb-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--rose-soft)]">First-time setup</div>
                <h2 id="first-run-title" className="mt-1 font-serif text-[30px] leading-tight text-white">Set up your Velvet studio.</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">One guided pass. Everything remains editable in Settings.</p>
              </div>
              <div className="text-right text-xs text-[var(--text-muted)]"><span className="text-lg font-semibold text-white">{completed[0] && completed[1] ? "Ready" : `${step + 1} / 2`}</span></div>
            </header>

            <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Onboarding progress">
              {steps.map((item, index) => (
                <button key={item.label} type="button" onClick={() => index <= step || completed[index] ? setStep(index) : undefined} className={`h-14 rounded-lg border px-3 text-left ${index === step ? "border-[var(--border-active)] bg-white/[0.07]" : "border-[var(--border)] bg-white/[0.025]"}`}>
                  <span className="flex items-center gap-2 text-xs font-medium text-white">{completed[index] ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <span className="tabular text-[var(--rose-soft)]">0{index + 1}</span>}{item.label}</span>
                  <span className="mt-1 block truncate text-[10px] text-[var(--text-muted)]">{item.detail}</span>
                </button>
              ))}
            </div>

            <motion.div key={step} className="mt-5 min-h-[190px]" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.16 }}>
              {step === 0 ? (
                <div>
                  <div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-[var(--rose-soft)]" /><div><h3 className="text-base font-medium">Connect OpenAI</h3><p className="text-xs text-[var(--text-muted)]">Creates blueprints, prompts, artwork direction, and publishing metadata.</p></div></div>
                  <div className="mt-4 max-w-xl"><Field label="OpenAI API key" placeholder={completed[0] ? "Already connected - enter a new key to replace it" : "sk-..."} secret value={openaiKey} onChange={setOpenaiKey} help="Create a project API key for Velvet." helpResource={{ href: "https://platform.openai.com/api-keys", linkLabel: "Open OpenAI API keys", steps: "Sign in, select your project, choose Create new secret key, then copy it immediately." }} /></div>
                </div>
              ) : step === 1 ? (
                <div>
                  <div className="flex items-center gap-3"><Music2 className="h-5 w-5 text-[var(--rose-soft)]" /><div><h3 className="text-base font-medium">Connect ElevenLabs</h3><p className="text-xs text-[var(--text-muted)]">Generates music only after you approve the track prompts.</p></div></div>
                  <div className="mt-4 max-w-xl"><Field label="ElevenLabs API key" placeholder={completed[1] ? "Already connected - enter a new key to replace it" : "Enter API key"} secret value={elevenLabsKey} onChange={setElevenLabsKey} help="Create an ElevenLabs key with access to music features." helpResource={{ href: "https://elevenlabs.io/app/developers/api-keys", linkLabel: "Open ElevenLabs API keys", steps: "Sign in, open Developers, choose API Keys, then create and copy a key." }} /></div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3"><Youtube className="h-5 w-5 text-[#ff4965]" /><div><h3 className="text-base font-medium">Connect YouTube <span className="text-xs font-normal text-[var(--text-muted)]">(optional)</span></h3><p className="text-xs text-[var(--text-muted)]">Only needed when you want Velvet to publish for you. Nothing uploads automatically.</p></div></div>
                  {completed[2] || youtubeLoginAvailable ? (
                    <div className="mt-4 rounded-lg border border-[var(--border)] bg-black/15 p-4 text-xs leading-5 text-[var(--text-secondary)]">
                      <p>{completed[2] ? "YouTube is already connected." : "Google will ask permission to identify your channel and upload videos. New uploads remain private by default."}</p>
                      {!completed[2] ? <GoogleTesterLink /> : null}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Google OAuth client ID" placeholder="...apps.googleusercontent.com" value={googleClientId} onChange={setGoogleClientId} help="Create a Desktop app OAuth client for this private Velvet installation." helpResource={{ href: "https://console.cloud.google.com/apis/credentials", linkLabel: "Open Google Cloud credentials", steps: "Enable YouTube Data API v3, configure the OAuth consent screen, then create an OAuth client ID for a Desktop app." }} />
                        <Field label="Google OAuth client secret" placeholder="Optional for Desktop app clients" secret value={googleClientSecret} onChange={setGoogleClientSecret} help="Usually optional. Add it only if Google supplied one for this client." />
                      </div>
                      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.035] px-3 text-xs text-[var(--rose-soft)] hover:border-[var(--border-hover)] hover:text-white">
                        Open Google OAuth setup
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {completed[0] && completed[1] ? (
              <div className="mb-3 rounded-lg border border-[rgba(143,195,177,.22)] bg-[rgba(143,195,177,.075)] px-3 py-2 text-xs leading-5 text-[var(--success)]">
                Core setup is complete. You can skip YouTube and use Velvet without auto-publishing.
              </div>
            ) : null}
            <div className={`rounded-lg border px-3 py-2 text-xs ${message.toLowerCase().includes("could not") || message.toLowerCase().includes("needs") ? "border-[rgba(213,143,154,0.3)] bg-[rgba(213,143,154,0.07)]" : "border-[var(--border)] bg-white/[0.025]"}`} aria-live="polite">{message}</div>

            <footer className="mt-4 flex items-center justify-between gap-3">
              <button type="button" onClick={finishLater} className="h-9 rounded-lg px-3 text-xs text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-white">{completed[0] && completed[1] ? "Skip YouTube" : "Finish later in Settings"}</button>
              <div className="flex items-center gap-2">
                {step > 0 ? <button type="button" onClick={() => setStep((current) => current - 1)} disabled={busy} className="h-9 rounded-lg border border-[var(--border)] px-4 text-xs text-[var(--text-secondary)] disabled:opacity-40">Back</button> : null}
                <button type="button" onClick={() => step === 0 ? saveProvider("openai") : step === 1 ? (completed[0] && completed[1] ? onDismiss(true) : saveProvider("elevenlabs")) : connectYouTubeAccount()} disabled={busy} className="glass-primary flex h-9 min-w-36 items-center justify-center gap-2 rounded-lg px-4 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-45">
                  {busy ? "Checking..." : step === 0 ? (completed[0] ? "Continue" : "Save & Continue") : step === 1 ? (completed[0] && completed[1] ? "Finish setup" : completed[1] ? "Finish setup" : "Save & Continue") : completed[2] ? "Finish setup" : "Log in with YouTube"}
                  {!busy ? <ArrowRight className="h-3.5 w-3.5" /> : null}
                </button>
              </div>
            </footer>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SettingsWorkspace({ setup }: { setup: SetupOverview }) {
  const setupController = useSetupController();
  const [accountMessage, setAccountMessage] = useState("Update the owner email or password for this Velvet studio.");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({ username: "", email: "", currentPassword: "", newPassword: "", confirmPassword: "" });
  const [youtubeStatus, setYoutubeStatus] = useState<string | null>(null);
  const [youtubeLoginAvailable, setYoutubeLoginAvailable] = useState(false);
  const [connectingYouTube, setConnectingYouTube] = useState(false);
  const [activeSetupStep, setActiveSetupStep] = useState<"services" | "youtube" | "review">("services");
  const [activeService, setActiveService] = useState<"openai" | "elevenlabs">("openai");
  const [setupSaveState, setSetupSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [savingSetup, setSavingSetup] = useState(false);
  const [setupMessage, setSetupMessage] = useState("Keys are encrypted before being stored locally.");
  const [providerStatus, setProviderStatus] = useState<Partial<Record<string, ClientStatus>>>({});
  const [savedKeyHints, setSavedKeyHints] = useState<Record<"openai" | "elevenlabs", string | undefined>>({ openai: undefined, elevenlabs: undefined });
  const [setupForm, setSetupForm] = useState<SetupForm>({
    openaiApiKey: "",
    elevenLabsApiKey: "",
    googleClientId: "",
    googleClientSecret: "",
    planningModel: "gpt-4.1",
    imageModel: "gpt-image-1",
    musicModel: "eleven-music",
    outputFormat: "mp3_44100_128",
    storageEndpoint: "",
    storageRegion: "auto",
    storageAccessKeyId: "",
    storageSecretAccessKey: "",
    databaseUrl: "",
    storageBucket: "velvet-assets",
    maxTracksPerRun: "10",
    maxRenderAttemptsPerProject: "5",
    openaiInputPerMillionTokens: "",
    openaiOutputPerMillionTokens: "",
    elevenLabsPerMinute: "",
    ffmpegPerRenderMinute: "",
    youtubeUploadPerVideo: ""
  });
  const settingsServices = setup.services.map((service) => ({
    ...service,
    status: providerStatus[service.label === "ChatGPT" ? "openai" : service.label === "ElevenLabs" ? "elevenlabs" : "youtube"]
  }));
  const openaiReady = providerStatus.openai?.state === "valid" || setup.services[0]?.ready;
  const elevenLabsReady = providerStatus.elevenlabs?.state === "valid" || setup.services[1]?.ready;
  const aiMusicReady = Boolean(openaiReady && elevenLabsReady);
  const youtubeReady = providerStatus.youtube?.state === "connected" || setup.services[2]?.ready;
  const onboardingReadyCount = Number(openaiReady) + Number(elevenLabsReady);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setYoutubeStatus(search.get("youtube"));
    if (search.get("setup") === "youtube") setActiveSetupStep("youtube");
  }, []);

  useEffect(() => {
    fetch("/api/auth/account")
      .then((response) => response.json())
      .then((data) => setAccountForm((current) => ({ ...current, username: data.account?.username ?? "", email: data.account?.email ?? "" })))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!setupController.loaded) return;
    const data = setupController.data;
    const storedSetup = data.setup ?? {};
        setProviderStatus({
          openai: storedSetup.openai?.status,
          elevenlabs: storedSetup.elevenlabs?.status,
          youtube: storedSetup.youtube?.status,
          worker: storedSetup.worker?.status,
          database: storedSetup.worker?.databaseStatus
        });
        setSavedKeyHints({
          openai: data.secretHints?.openai,
          elevenlabs: data.secretHints?.elevenlabs
        });
        setYoutubeLoginAvailable(Boolean(data.secrets?.youtubeOAuth));
        setSetupForm((current) => ({
          ...current,
          planningModel: storedSetup.openai?.planningModel ?? current.planningModel,
          imageModel: storedSetup.openai?.imageModel ?? current.imageModel,
          musicModel: storedSetup.elevenlabs?.musicModel ?? current.musicModel,
          outputFormat: storedSetup.elevenlabs?.outputFormat ?? current.outputFormat,
          storageEndpoint: storedSetup.worker?.storageEndpoint ?? current.storageEndpoint,
          storageRegion: storedSetup.worker?.storageRegion ?? current.storageRegion,
          storageBucket: storedSetup.worker?.storageBucket ?? current.storageBucket,
          maxTracksPerRun: String(storedSetup.budget?.maxTracksPerRun ?? current.maxTracksPerRun),
          maxRenderAttemptsPerProject: String(storedSetup.budget?.maxRenderAttemptsPerProject ?? current.maxRenderAttemptsPerProject),
          openaiInputPerMillionTokens: String(storedSetup.pricing?.openaiInputPerMillionTokens ?? current.openaiInputPerMillionTokens),
          openaiOutputPerMillionTokens: String(storedSetup.pricing?.openaiOutputPerMillionTokens ?? current.openaiOutputPerMillionTokens),
          elevenLabsPerMinute: String(storedSetup.pricing?.elevenLabsPerMinute ?? current.elevenLabsPerMinute),
          ffmpegPerRenderMinute: String(storedSetup.pricing?.ffmpegPerRenderMinute ?? current.ffmpegPerRenderMinute),
          youtubeUploadPerVideo: String(storedSetup.pricing?.youtubeUploadPerVideo ?? current.youtubeUploadPerVideo)
        }));
  }, [setupController.data, setupController.loaded]);

  function updateSetupForm(field: keyof SetupForm, value: string) {
    setSetupForm((current) => ({ ...current, [field]: value }));
  }

  function updateAccountForm(field: keyof typeof accountForm, value: string) {
    setAccountForm((current) => ({ ...current, [field]: value }));
  }

  async function saveAccount() {
    if (accountForm.newPassword && accountForm.newPassword !== accountForm.confirmPassword) {
      setAccountMessage("New passwords do not match.");
      return;
    }
    setSavingAccount(true);
    setAccountMessage("Saving account changes...");
    try {
      const response = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: accountForm.username,
          email: accountForm.email,
          currentPassword: accountForm.currentPassword,
          password: accountForm.newPassword
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Account could not be updated.");
      setAccountForm((current) => ({ ...current, currentPassword: "", newPassword: "", confirmPassword: "", username: data.account?.username ?? current.username, email: data.account?.email ?? current.email }));
      setAccountMessage("Account updated.");
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : "Account could not be updated.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function saveSetup(validateServices = true) {
    setSavingSetup(true);
    setSetupSaveState("saving");
    setSetupMessage("Saving encrypted setup...");
    try {
      const providers = validateServices
        ? ([
            ...(setupForm.openaiApiKey || setupController.data.secrets?.openai ? ["openai"] : []),
            ...(setupForm.elevenLabsApiKey || setupController.data.secrets?.elevenlabs ? ["elevenlabs"] : []),
            ...(setupForm.databaseUrl || setupController.data.secrets?.database ? ["database"] : []),
            ...(setupForm.storageEndpoint || setupForm.storageAccessKeyId || setupController.data.secrets?.storage ? ["storage"] : [])
          ] as Array<"openai" | "elevenlabs" | "database" | "storage">)
        : [];
      const data = await setupController.saveAndValidate(setupForm, providers);
      const savedStatuses = {
        openai: data.setup?.openai?.status,
        elevenlabs: data.setup?.elevenlabs?.status,
        youtube: data.setup?.youtube?.status,
        worker: data.setup?.worker?.status,
        database: data.setup?.worker?.databaseStatus
      };
      setProviderStatus(savedStatuses);
      setSavedKeyHints({ openai: data.secretHints?.openai, elevenlabs: data.secretHints?.elevenlabs });
      setSetupSaveState("success");
      setSetupMessage(validateServices ? "Setup saved and connected services checked." : "Setup saved.");

      if (validateServices) {
        const checkedStatuses = data.validation ?? {};
        const nextStatuses = { ...savedStatuses, ...checkedStatuses };
        setProviderStatus(nextStatuses);

        const failedServices = (["openai", "elevenlabs"] as const)
          .filter((provider) => providers.includes(provider))
          .filter((provider) => checkedStatuses[provider]?.state !== "valid")
          .map((provider) => provider === "openai" ? "ChatGPT" : "ElevenLabs");
        const coreServicesReady = nextStatuses.openai?.state === "valid" && nextStatuses.elevenlabs?.state === "valid";

        if (coreServicesReady && activeSetupStep === "services") {
          setActiveSetupStep("review");
          setSetupSaveState("success");
          setSetupMessage("ChatGPT and ElevenLabs are connected. YouTube is optional for publishing later.");
        } else if (failedServices.length) {
          setSetupSaveState("error");
          setSetupMessage(`${failedServices.join(" and ")} could not be verified. Check the status below and try again.`);
        } else {
          setSetupMessage(providers.length ? "Setup saved and connected services checked." : "Setup saved.");
        }
      } else {
        setSetupMessage("Setup saved.");
      }

      return true;
    } catch {
      setSetupSaveState("error");
      setSetupMessage("Setup could not be saved. Check your connection and try again.");
      return false;
    } finally {
      setSavingSetup(false);
    }
  }

  async function connectYouTube() {
    if (!youtubeLoginAvailable && !setupForm.googleClientId.trim()) {
      setSetupSaveState("error");
      setSetupMessage("Add the Google OAuth client ID below, then select Log in with YouTube again.");
      return;
    }

    setConnectingYouTube(true);
    if (!youtubeLoginAvailable) {
      setSetupSaveState("saving");
      setSetupMessage("Saving the encrypted Google connection...");
      try {
        await configureYouTubeOAuth(setupForm.googleClientId, setupForm.googleClientSecret);
        setYoutubeLoginAvailable(true);
        setSetupForm((current) => ({ ...current, googleClientId: "", googleClientSecret: "" }));
      } catch (error) {
        setConnectingYouTube(false);
        setSetupSaveState("error");
        setSetupMessage(error instanceof Error ? error.message : "Google sign-in could not be configured.");
        return;
      }
    }

    window.open("/api/youtube/login", "_blank", "noopener,noreferrer");
    setSetupSaveState("saving");
    setSetupMessage("Finish signing in with your Google account. Velvet will connect automatically.");

    try {
      const data = await waitForYouTubeConnection();
      setProviderStatus((current) => ({ ...current, youtube: data.setup?.youtube?.status }));
      setSetupSaveState("success");
      setSetupMessage(data.setup?.youtube?.status?.message ?? "YouTube connected successfully.");
      setActiveSetupStep("review");
    } catch (error) {
      setSetupSaveState("error");
      setSetupMessage(error instanceof Error ? error.message : "YouTube sign-in was not completed.");
    } finally {
      setConnectingYouTube(false);
    }
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
    <div className="min-h-0 flex-1 overflow-hidden p-3 lg:p-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-5">
        <section className="panel settings-primary rounded-xl p-4">
          <div className="mb-4 rounded-xl border border-[var(--border)] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SectionTitle label="Velvet Account" icon={<Lock className="h-4 w-4" />} />
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Change the owner email or password used on the login screen.</p>
              </div>
              <button onClick={saveAccount} disabled={savingAccount || !accountForm.currentPassword} className="glass-primary flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40">{savingAccount ? "Saving" : "Save account"}<ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Username" placeholder="Username" value={accountForm.username} onChange={(value) => updateAccountForm("username", value)} />
              <Field label="Email" placeholder="you@example.com" value={accountForm.email} onChange={(value) => updateAccountForm("email", value)} />
              <Field label="Current password" placeholder="Required to save" secret value={accountForm.currentPassword} onChange={(value) => updateAccountForm("currentPassword", value)} />
              <Field label="New password" placeholder="Leave blank to keep current" secret value={accountForm.newPassword} onChange={(value) => updateAccountForm("newPassword", value)} />
              <Field label="Confirm new password" placeholder="Confirm password" secret value={accountForm.confirmPassword} onChange={(value) => updateAccountForm("confirmPassword", value)} />
            </div>
            <p className={`mt-3 text-xs ${accountMessage.toLowerCase().includes("updated") ? "text-[var(--success)]" : accountMessage.toLowerCase().includes("not") || accountMessage.toLowerCase().includes("match") || accountMessage.toLowerCase().includes("could") ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>{accountMessage}</p>
          </div>
          <SectionTitle label="Onboarding" />
          <p className="settings-intro mt-2 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
            Connect ChatGPT and ElevenLabs to create music. YouTube is optional and only used when you choose to publish from Velvet. Model and format defaults are handled automatically.
          </p>

          <div className="settings-progress mt-3 grid grid-cols-[120px_1fr] gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-white/[0.035] p-3">
              <div className="text-xs text-[var(--text-muted)]">Setup progress</div>
              <div className="setup-progress-count mt-2 whitespace-nowrap text-[28px] font-semibold leading-none tabular-nums tracking-normal text-white">
                {onboardingReadyCount}<span className="mx-1 text-[var(--text-muted)]">/</span>2
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-black/25">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--blue),var(--rose))] transition-[width] duration-500"
                  style={{ width: `${(onboardingReadyCount / 2) * 100}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["services", "01", "AI + Music"],
                ["youtube", "02", "YouTube"],
                ["review", "03", "Advanced"]
              ].map(([key, number, label]) => {
                const completed = key === "services" ? aiMusicReady : key === "youtube" ? youtubeReady : aiMusicReady;
                return (
                <button
                  key={key}
                  data-testid="onboarding-step"
                  onClick={() => setActiveSetupStep(key as "services" | "youtube" | "review")}
                  className={`flex h-12 flex-col justify-center rounded-lg border px-3 text-left ${
                    activeSetupStep === key ? "border-[var(--border-active)] bg-[rgba(239,99,152,0.09)]" : "border-[var(--border)] bg-white/[0.035]"
                  }`}
                >
                  <span className="tabular text-[11px] leading-none text-[var(--rose-soft)]">{completed ? <Check className="h-3.5 w-3.5" aria-label={`${label} complete`} /> : number}</span>
                  <span className="mt-1.5 truncate text-[11px] font-medium leading-none">{label}{key === "youtube" ? " (optional)" : ""}</span>
                </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3">
            {activeSetupStep === "services" ? (
              <div className="space-y-3">
                <div className="grid h-10 grid-cols-2 rounded-lg bg-black/20 p-1">
                  <button onClick={() => setActiveService("openai")} className={`rounded-md text-xs font-medium ${activeService === "openai" ? "bg-white/[0.08] text-white" : "text-[var(--text-muted)] hover:text-white"}`}>ChatGPT</button>
                  <button onClick={() => setActiveService("elevenlabs")} className={`rounded-md text-xs font-medium ${activeService === "elevenlabs" ? "bg-white/[0.08] text-white" : "text-[var(--text-muted)] hover:text-white"}`}>ElevenLabs</button>
                </div>
                <motion.div key={activeService} initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
                {activeService === "openai" ? (
                <SetupCard
                  icon={<KeyRound className="h-5 w-5" />}
                  title="ChatGPT / OpenAI"
                  body="Used for song and album blueprints, prompt revisions, artwork prompts, image generation and YouTube metadata."
                  status={formatProviderStatus(providerStatus.openai, setup.services[0]?.ready)}
                >
                  <Field
                    label="OpenAI API key"
                    placeholder={savedKeyHints.openai ?? "sk-..."}
                    secret
                    value={setupForm.openaiApiKey}
                    onChange={(value) => updateSetupForm("openaiApiKey", value)}
                    help="Used for song and album planning, prompt rewriting, artwork prompts, and metadata."
                    helpResource={{
                      href: "https://platform.openai.com/api-keys",
                      linkLabel: "Open OpenAI API keys",
                      steps: "Sign in, select your project, choose Create new secret key, then copy it immediately. The full key is shown only once."
                    }}
                  />
                  {savedKeyHints.openai ? <p className="text-xs text-[var(--success)]">Saved key: {savedKeyHints.openai}</p> : null}
                  <p className="setup-card-note text-xs leading-5 text-[var(--text-muted)]">Velvet chooses the planning and image models automatically.</p>
                  <StatusLine status={providerStatus.openai} />
                </SetupCard>
                ) : (
                <SetupCard
                  icon={<Music2 className="h-5 w-5" />}
                  title="ElevenLabs"
                  body="Used only when approved track prompts are ready for music generation."
                  status={formatProviderStatus(providerStatus.elevenlabs, setup.services[1]?.ready)}
                >
                  <Field
                    label="ElevenLabs API key"
                    placeholder={savedKeyHints.elevenlabs ?? "Enter key"}
                    secret
                    value={setupForm.elevenLabsApiKey}
                    onChange={(value) => updateSetupForm("elevenLabsApiKey", value)}
                    help="Used only after you approve track prompts."
                    helpResource={{
                      href: "https://elevenlabs.io/app/developers/api-keys",
                      linkLabel: "Open ElevenLabs API keys",
                      steps: "Sign in, open Developers, choose API Keys, then create and copy a key. Allow the music features Velvet uses."
                    }}
                  />
                  {savedKeyHints.elevenlabs ? <p className="text-xs text-[var(--success)]">Saved key: {savedKeyHints.elevenlabs}</p> : null}
                  <p className="setup-card-note text-xs leading-5 text-[var(--text-muted)]">Velvet uses the default ElevenLabs music model and reads quota usage from the key.</p>
                  <StatusLine status={providerStatus.elevenlabs} />
                </SetupCard>
                )}
                </motion.div>
              </div>
            ) : null}

            {activeSetupStep === "youtube" ? (
              <div className="space-y-3">
              <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-3">
                <SetupCard
                  icon={<Youtube className="h-5 w-5" />}
                  title="YouTube (optional)"
                  body="Only connect YouTube if you want Velvet to schedule or upload releases. Creating, rendering, and exporting still work without it."
                  status={formatProviderStatus(providerStatus.youtube, setup.services[2]?.ready)}
                >
                  <button
                    onClick={connectYouTube}
                    disabled={connectingYouTube}
                    title="Open Google's secure account sign-in."
                    className="flex h-9 items-center justify-center gap-2 rounded-lg bg-[rgba(255,0,51,0.84)] px-4 text-sm font-medium text-white shadow-[0_10px_26px_rgba(255,0,51,0.14)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Youtube className="h-4 w-4" />
                    {connectingYouTube ? "Waiting for Google..." : "Log in with YouTube"}
                  </button>
                  {!youtubeLoginAvailable ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Google OAuth client ID"
                        placeholder="...apps.googleusercontent.com"
                        value={setupForm.googleClientId}
                        onChange={(value) => updateSetupForm("googleClientId", value)}
                        help="Create a Desktop app OAuth client for this private Velvet installation."
                        helpResource={{
                          href: "https://console.cloud.google.com/apis/credentials",
                          linkLabel: "Open Google Cloud credentials",
                          steps: "Enable YouTube Data API v3, configure the OAuth consent screen, choose Create credentials, then OAuth client ID and Desktop app."
                        }}
                      />
                      <Field
                        label="Google OAuth client secret"
                        placeholder="Optional for Desktop app clients"
                        secret
                        value={setupForm.googleClientSecret}
                        onChange={(value) => updateSetupForm("googleClientSecret", value)}
                        help="Usually optional for a Desktop app client. Add it only when Google supplied one for the selected client."
                      />
                    </div>
                  ) : null}
                  <p className="text-xs leading-5 text-[var(--text-muted)]">
                    {youtubeLoginAvailable
                      ? "Your password is entered only on Google. Velvet stores the resulting refresh token encrypted. Uploads still require your explicit action."
                      : "Paste the one-time Google client ID only if you want built-in publishing. Velvet will not auto-upload anything."}
                    {!youtubeLoginAvailable ? (
                      <HelpTooltip
                        label="How to configure Google sign-in"
                        help="This is a one-time app-owner setting, not something every Velvet user enters."
                        resource={{
                          href: "https://console.cloud.google.com/apis/credentials",
                          linkLabel: "Open Google Cloud credentials",
                          steps: "Enable YouTube Data API v3, configure the OAuth consent screen, then create an OAuth client for Velvet."
                        }}
                      />
                    ) : null}
                  </p>
                  {!setup.services[2]?.ready ? <GoogleTesterLink /> : null}
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
              {youtubeStatus ? <YouTubeStatusNotice status={youtubeStatus} /> : null}
              </div>
            ) : null}

            {activeSetupStep === "review" ? (
              <div className="grid grid-cols-2 gap-3">
                <SetupCard
                  icon={<Database className="h-5 w-5" />}
                  title="Database & media"
                  body="Railway connections are detected automatically. Manual S3 and PostgreSQL details remain available for desktop or another host."
                  status={formatProviderStatus(providerStatus.worker)}
                >
                  <AdvancedSetup label="Database and media settings">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Storage endpoint" placeholder="https://storage.railway.app" value={setupForm.storageEndpoint} onChange={(value) => updateSetupForm("storageEndpoint", value)} help="Leave blank when Railway injects bucket credentials." />
                      <Field label="Storage bucket" placeholder="velvet-assets" value={setupForm.storageBucket} onChange={(value) => updateSetupForm("storageBucket", value)} help="Private bucket for generated audio, artwork, manifests, and renders." />
                      <Field label="Storage access key" placeholder="Access key ID" secret value={setupForm.storageAccessKeyId} onChange={(value) => updateSetupForm("storageAccessKeyId", value)} help="Encrypted locally. Railway can provide this automatically." />
                      <Field label="Storage secret key" placeholder="Secret access key" secret value={setupForm.storageSecretAccessKey} onChange={(value) => updateSetupForm("storageSecretAccessKey", value)} help="Encrypted locally and never returned to the browser." />
                      <Field label="Storage region" placeholder="auto" value={setupForm.storageRegion} onChange={(value) => updateSetupForm("storageRegion", value)} help="Use auto for Railway and Cloudflare R2." />
                      <Field label="Database URL" placeholder="postgresql://..." secret value={setupForm.databaseUrl} onChange={(value) => updateSetupForm("databaseUrl", value)} help="Leave blank when Railway injects DATABASE_URL." />
                    </div>
                  </AdvancedSetup>
                  <button onClick={syncDatabase} className="h-8 rounded-lg border border-[var(--border)] bg-white/[0.05] px-3 text-xs text-[var(--text-secondary)]">
                    Initialize & Sync
                  </button>
                  <StatusLine status={providerStatus.database} />
                  <StatusLine status={providerStatus.worker} />
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

          <div className="settings-security mt-3 flex items-center justify-between gap-4 rounded-xl border border-[rgba(239,99,152,0.22)] bg-[rgba(239,99,152,0.06)] p-3">
            <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="h-4 w-4 text-[var(--rose-soft)]" />
              Server-side only
            </div>
            <p className="settings-security-copy mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              Real keys and OAuth tokens are encrypted for local use, or read from production environment-backed secret storage when configured.
            </p>
            </div>
            <button
              onClick={() => saveSetup()}
              disabled={savingSetup}
              className="h-10 shrink-0 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 text-sm font-medium"
              title="Stores configuration after backend secret storage is enabled."
            >
              {savingSetup ? "Checking..." : "Save Setup"}
            </button>
          </div>
          {setupSaveState !== "idle" ? (
            <div className={`mt-2 rounded-lg border px-3 py-2 text-xs text-[var(--text-secondary)] ${setupSaveState === "error" ? "border-[rgba(213,143,154,0.32)] bg-[rgba(213,143,154,0.08)]" : "border-[rgba(88,182,168,0.22)] bg-[rgba(88,182,168,0.06)]"}`}>
              {setupMessage}
            </div>
          ) : null}

        </section>
          <aside className="hidden space-y-4 xl:block">
          <StudioHealth />
          <aside className="panel rounded-xl p-5">
            <SectionTitle label="Readiness" />
            <div className="mt-4 space-y-3">
              {settingsServices.map((item) => (
                <div key={item.label} className="rounded-lg border border-[var(--border)] bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-3 text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.ready || item.status?.state === "valid" || item.status?.state === "connected" ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"}`} />
                      {item.label === "ChatGPT" ? "ChatGPT / OpenAI" : item.label}
                    </span>
                    <span className="rounded-full border border-[var(--border)] bg-black/10 px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                      {formatProviderStatus(item.status, item.ready)}
                    </span>
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
      ? "Google sign-in is not configured for this Velvet build. The app owner needs to add its Google OAuth client ID once."
      : status === "authorized_pending_storage"
        ? "YouTube authorized successfully. Token exchange and encrypted storage are the next backend step."
        : status === "connected"
          ? "YouTube connected successfully. Refresh token stored encrypted."
          : status === "token_exchange_failed"
            ? "YouTube authorized, but Google could not finish the secure token exchange. Please try again."
        : status === "invalid_state"
          ? "YouTube login could not be verified. Please try again."
          : status === "denied"
            ? "Google denied access. If the OAuth app is in Testing, add this Google account under Google Auth Platform > Audience > Test users, then try again."
            : "YouTube login was not completed.";

  return (
    <div className="mt-3 rounded-xl border border-[rgba(213,161,94,0.28)] bg-[rgba(213,161,94,0.07)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
      {message}
    </div>
  );
}

function GoogleTesterLink() {
  return (
    <a href="https://console.cloud.google.com/auth/audience" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[var(--rose-soft)] hover:text-white">
      Error 403? Add this account as a Google test user
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

// Kept as a compact fallback while the active New Media screen is loaded in its own bundle.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function NewProjectFlow() {
  const [mediaType, setMediaType] = useState<"song" | "album">("song");
  const [brief, setBrief] = useState("");
  const [message, setMessage] = useState("Blueprint generation uses your encrypted OpenAI key after setup.");
  const [isCreating, setIsCreating] = useState(false);
  const [promptProducerOpen, setPromptProducerOpen] = useState(false);

  async function createBlueprint() {
    setIsCreating(true);
    setMessage("Creating blueprint...");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, mediaType })
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
    <div className="new-media-workspace flex min-h-0 flex-1 items-center overflow-hidden p-3 lg:p-5">
      <div className={`mx-auto grid w-full grid-cols-1 gap-4 xl:gap-5 ${promptProducerOpen ? "max-w-[1200px] xl:grid-cols-[minmax(0,1fr)_380px]" : "max-w-[1120px] xl:grid-cols-[1fr_340px]"}`}>
        <section className="new-media-panel panel glass-panel-strong rounded-xl p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rose-soft)]">New media</div>
          <h1 className="mt-2 text-[38px] font-semibold leading-[1.08] text-white">Describe the song or album.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Choose the release type, then write the prompt. Mood, instrumentation, length and release style are enough to begin.
          </p>
          <div className="glass-control mt-5 grid h-12 grid-cols-2 rounded-xl p-1">
            {(["song", "album"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMediaType(type)}
                className={`rounded-lg text-sm font-medium capitalize transition ${
                  mediaType === type
                    ? "border border-white/[.15] bg-white/[.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
                    : "text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-white"
                }`}
                aria-pressed={mediaType === type}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-muted)]">Production brief</span>
            <button
              type="button"
              onClick={() => setPromptProducerOpen(true)}
              className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border-active)] bg-[rgba(226,102,174,.08)] px-3 text-xs font-medium text-[var(--rose-soft)] transition hover:bg-[rgba(226,102,174,.14)]"
            >
              <WandSparkles className="h-3.5 w-3.5" />
              Prompt Producer
            </button>
          </div>
          <textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            className="glass-control mt-2 min-h-[180px] w-full resize-none rounded-xl p-4 text-sm leading-6 text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]"
            placeholder={
              mediaType === "song"
                ? "Example: A smoky late-night jazz single with slow saxophone, intimate piano, brushed drums, and a cinematic noir mood. Around four minutes."
                : "Example: A moody late-night jazz album with slow saxophone, intimate piano and brushed drums. Instrumental, cinematic, elegant, and made for a long-form YouTube release."
            }
            aria-label="Media brief"
          />
          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-xs leading-5 text-[var(--text-muted)]">{message}</p>
            <button
              onClick={createBlueprint}
              disabled={isCreating}
              className="glass-primary flex h-12 shrink-0 items-center gap-2 rounded-lg px-5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create Blueprint"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
        <div className="hidden min-h-0 xl:block">
          <AnimatePresence mode="wait">
            {promptProducerOpen ? (
              <PromptProducer
                key="prompt-producer"
                open
                mediaType={mediaType}
                onClose={() => setPromptProducerOpen(false)}
                onComplete={(prompt, source) => {
                  setBrief(prompt);
                  setMessage(source === "ai" ? "Prompt Producer created this brief with ChatGPT. Review or edit it before continuing." : "Prompt created. Review or edit it before continuing.");
                }}
              />
            ) : (
              <motion.div key="new-media-guidance" className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyPanel title="Release type" body="Songs create one-track blueprints. Albums create a multi-track plan with optional publishing metadata." />
                <EmptyPanel title="Optional" body="After the prompt, Velvet can ask for length, track count, vocals and workflow mode only if needed." />
                <EmptyPanel title="Before generation" body="You will review the blueprint first. ChatGPT and ElevenLabs calls stay blocked until approved." />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
    <article className="setup-card rounded-xl border border-[var(--border)] bg-white/[0.035] p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-black/15 text-[var(--rose-soft)] [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="setup-card-body mt-1 text-xs leading-4 text-[var(--text-muted)]">{body}</p>
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

function formatProviderStatus(status?: ClientStatus, hasSecret = false) {
  if (status?.state === "valid" || status?.state === "connected") {
    return "Ready";
  }

  if (hasSecret || status?.state === "unchecked") {
    return "Saved";
  }

  if (status?.state === "invalid" || status?.state === "error") {
    return "Needs attention";
  }

  return "Not connected";
}

function Field({
  label,
  placeholder,
  secret = false,
  help,
  helpResource,
  value,
  onChange
}: {
  label: string;
  placeholder: string;
  secret?: boolean;
  help?: string;
  helpResource?: HelpResource;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const inputId = useId();

  return (
    <div className="block text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
      <span className="flex items-center gap-1.5">
        <label htmlFor={inputId}>
        {label}
        </label>
        {help ? (
          <HelpTooltip label={`How to get ${label}`} help={help} resource={helpResource} />
        ) : null}
      </span>
      <input
        id={inputId}
        type={secret ? "password" : "text"}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-1.5 h-8 w-full rounded-lg border border-[var(--border)] bg-black/15 px-3 text-xs normal-case tracking-normal text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]"
        placeholder={placeholder}
      />
    </div>
  );
}

type HelpResource = {
  href: string;
  linkLabel: string;
  steps: string;
};

function HelpTooltip({ label, help, resource }: { label: string; help: string; resource?: HelpResource }) {
  const tooltipId = useId();

  return (
    <span className="group/help relative inline-flex normal-case tracking-normal">
      <button type="button" title={label} aria-label="Open help tooltip" aria-describedby={tooltipId} className="grid h-5 w-5 place-items-center rounded text-[var(--rose-soft)] hover:bg-white/[0.07] hover:text-white focus-visible:bg-white/[0.07]">
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-6 z-[90] w-72 translate-y-1 rounded-lg border border-[var(--border-hover)] bg-[#181421] p-3 text-left text-xs leading-5 text-[var(--text-secondary)] opacity-0 shadow-[0_18px_50px_rgba(0,0,0,0.48)] transition duration-150 group-hover/help:pointer-events-auto group-hover/help:visible group-hover/help:translate-y-0 group-hover/help:opacity-100 group-focus-within/help:pointer-events-auto group-focus-within/help:visible group-focus-within/help:translate-y-0 group-focus-within/help:opacity-100"
      >
        <span className="block">{help}</span>
        {resource ? (
          <>
            <span className="mt-2 block text-[var(--text-muted)]">{resource.steps}</span>
            <a href={resource.href} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 font-medium text-[var(--rose-soft)] hover:text-white">
              {resource.linkLabel}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </>
        ) : null}
      </span>
    </span>
  );
}

function BottomPlayer() {
  const { activeTrack, isPlaying, positionSeconds, volume, togglePlaying, seek, setVolume } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [repeat, setRepeat] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack?.sourceUrl) return;
    audio.volume = volume / 100;
    if (isPlaying) audio.play().catch(() => undefined);
    else audio.pause();
  }, [activeTrack, isPlaying, volume]);

  useEffect(() => {
    if (audioRef.current && Math.abs(audioRef.current.currentTime - positionSeconds) > 1.2) audioRef.current.currentTime = positionSeconds;
  }, [positionSeconds]);

  if (!activeTrack) return null;
  const progress = activeTrack.durationSeconds ? positionSeconds / activeTrack.durationSeconds : 0;

  return (
    <motion.footer className="panel mt-4 hidden h-20 grid-cols-[300px_150px_minmax(260px,1fr)_120px_190px] items-center gap-4 rounded-xl px-4 lg:grid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
      <audio ref={audioRef} src={activeTrack.sourceUrl} loop={repeat} onTimeUpdate={(event) => seek(event.currentTarget.currentTime)} onEnded={() => usePlayerStore.setState({ positionSeconds: 0, isPlaying: false })} />
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-14 w-14 shrink-0"><ProjectArtwork title={activeTrack.artworkTitle} compact /></div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{activeTrack.title}</div>
          <div className="mt-1 truncate text-xs text-[var(--text-muted)]">{activeTrack.projectTitle}</div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => seek(0)} title="Previous track" aria-label="Previous track" className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-white"><SkipBack className="h-4 w-4 fill-current" /></button>
        <motion.button whileTap={{ scale: 0.92 }} aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlaying} className="grid h-11 w-11 place-items-center rounded-full bg-[linear-gradient(135deg,var(--violet),var(--rose))] text-white shadow-[0_10px_30px_rgba(239,99,152,0.18)]">
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
        </motion.button>
        <button onClick={() => seek(activeTrack.durationSeconds)} title="Next track" aria-label="Next track" className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-white"><SkipForward className="h-4 w-4 fill-current" /></button>
      </div>
      <div className="relative min-w-0">
        <Waveform isPlaying={isPlaying} progress={progress} />
        <input aria-label="Track position" type="range" min={0} max={activeTrack.durationSeconds} value={Math.min(positionSeconds, activeTrack.durationSeconds)} onChange={(event) => { const next = Number(event.target.value); seek(next); if (audioRef.current) audioRef.current.currentTime = next; }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </div>
      <div className="tabular text-center text-xs text-[var(--text-muted)]">{formatDuration(positionSeconds)} / {formatDuration(activeTrack.durationSeconds)}</div>
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        <button onClick={() => setRepeat((current) => !current)} title="Repeat" aria-label="Repeat" aria-pressed={repeat} className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-white/[0.05] hover:text-white ${repeat ? "text-[var(--rose-soft)]" : "text-[var(--text-muted)]"}`}><Repeat2 className="h-4 w-4" /></button>
        <Volume2 className="h-4 w-4" />
        <input
          aria-label="Volume"
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
          className="h-1 min-w-0 flex-1 accent-[var(--rose-soft)]"
        />
      </div>
    </motion.footer>
  );
}

function SectionTitle({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon ? <span className="text-[var(--rose-soft)]">{icon}</span> : <span className="h-1.5 w-1.5 rounded-full bg-[var(--rose-soft)]" />}
      <h2 className="text-xs font-semibold uppercase tracking-[0.13em] text-[var(--text-primary)]">{label}</h2>
    </div>
  );
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/projects/") && pathname.endsWith("/timeline")) {
    return "Video Editor";
  }
  if (pathname === "/video-editor") {
    return "Video Editor";
  }
  if (pathname.startsWith("/projects/") && pathname.endsWith("/thumbnail")) {
    return "Thumbnail Editor";
  }
  if (pathname === "/thumbnail-editor") {
    return "Thumbnail Editor";
  }
  if (pathname === "/projects/new") {
    return "New Media";
  }
  if (pathname === "/projects") {
    return "Projects";
  }
  if (pathname === "/history") {
    return "History";
  }
  if (pathname === "/publishing") {
    return "Scheduler";
  }
  if (pathname === "/analytics") {
    return "Analytics";
  }
  if (pathname.startsWith("/settings")) {
    return "Settings";
  }
  return "Welcome";
}
