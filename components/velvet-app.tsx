"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  Clapperboard,
  Database,
  Download,
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
  Sparkles,
  SlidersHorizontal,
  Upload,
  Volume2,
  WandSparkles,
  Youtube
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { historyColumns, historyPromptTypes, navItems, safetyDefaults, setupSteps } from "@/lib/app-data";
import { formatDuration } from "@/lib/time";
import { usePlayerStore } from "@/store/player-store";
import { CommandPalette, ProjectArtwork, StatusPill, Waveform } from "@/components/studio-chrome";
import { CreativeVariantsDrawer, emitToast, GenerationDrawer, ReferenceUploader, SequenceDrawer, ToastHost, TrackAuditionDrawer, type StudioProduction, type StudioTrack } from "@/components/project-studio-tools";

export function VelvetApp() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const setupOverview = useSetupOverview();
  const activeTrack = usePlayerStore((state) => state.activeTrack);
  const [commandOpen, setCommandOpen] = useState(false);
  const [compactDensity, setCompactDensity] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => setCompactDensity(window.localStorage.getItem("velvet-density") === "compact"), []);

  function toggleDensity() {
    setCompactDensity((current) => {
      window.localStorage.setItem("velvet-density", current ? "comfortable" : "compact");
      return !current;
    });
  }

  return (
    <main className={`relative z-10 h-screen min-w-0 overflow-hidden p-3 text-[15px] lg:p-5 ${compactDensity ? "compact-density" : ""}`}>
      <div className={`grid h-[calc(100vh-24px)] grid-cols-[64px_minmax(0,1fr)] gap-3 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-5 ${activeTrack ? "lg:h-[calc(100vh-136px)]" : "lg:h-[calc(100vh-40px)]"}`}>
        <Sidebar pathname={pathname} setup={setupOverview} />
        <section className="panel flex min-h-0 flex-col overflow-hidden rounded-2xl lg:rounded-[22px]">
          <TopBar pageTitle={pageTitle} setup={setupOverview} onOpenCommand={() => setCommandOpen(true)} compactDensity={compactDensity} onToggleDensity={toggleDensity} />
          <motion.div key={pathname} className="flex min-h-0 flex-1" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            {pathname === "/projects/new" ? <NewProjectFlow /> : <FreshWorkspace pathname={pathname} setup={setupOverview} />}
          </motion.div>
        </section>
      </div>
      <BottomPlayer />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <ToastHost />
    </main>
  );
}

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

type SetupOverview = {
  readyCount: number;
  isComplete: boolean;
  services: Array<{ label: string; ready: boolean }>;
};

const emptySetupOverview: SetupOverview = {
  readyCount: 0,
  isComplete: false,
  services: [
    { label: "ChatGPT", ready: false },
    { label: "ElevenLabs", ready: false },
    { label: "YouTube", ready: false }
  ]
};

function useSetupOverview() {
  const [setup, setSetup] = useState<SetupOverview>(emptySetupOverview);

  useEffect(() => {
    fetch("/api/setup")
      .then((response) => response.json())
      .then((data) => {
        const services = [
          { label: "ChatGPT", ready: Boolean(data.secrets?.openai) },
          { label: "ElevenLabs", ready: Boolean(data.secrets?.elevenlabs) },
          { label: "YouTube", ready: Boolean(data.secrets?.youtube) }
        ];
        const readyCount = services.filter((service) => service.ready).length;
        setSetup({ services, readyCount, isComplete: readyCount === services.length });
      })
      .catch(() => setSetup(emptySetupOverview));
  }, []);

  return setup;
}

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
  referenceAssets?: Array<{ id: string; name: string; kind: "audio" | "artwork"; filePath: string; createdAt: string }>;
  creativeVariants?: { titles: string[]; thumbnailPrompts: string[]; createdAt: string };
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
    <aside className="panel flex min-h-0 flex-col rounded-2xl px-2 py-4 lg:rounded-[22px] lg:px-4 lg:py-5">
      <div className="lg:px-2">
        <Link href="/dashboard" className="flex items-center justify-center gap-3 lg:justify-start" aria-label="Velvet AI music foundry">
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

      <nav className="mt-7 flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = isActiveNavItem(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex h-11 items-center justify-center gap-3 rounded-lg border px-0 text-sm transition lg:justify-start lg:px-4 ${
                isActive
                  ? "border-[var(--border-active)] bg-[rgba(239,99,152,0.13)] text-white shadow-[inset_0_0_18px_rgba(239,99,152,0.12)]"
                  : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-white/[0.035] hover:text-white"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${isActive ? "text-[var(--rose-soft)]" : "text-[#a9a3bd]"}`} />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link href="/settings" className="hidden rounded-lg border border-[var(--border)] bg-white/[0.025] p-3 transition hover:border-[var(--border-hover)] hover:bg-white/[0.04] lg:block">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          <span>Studio readiness</span>
          <span className="tabular text-[var(--text-secondary)]">{setup.readyCount}/3</span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--violet),var(--rose))] transition-[width] duration-500"
            style={{ width: `${(setup.readyCount / 3) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex gap-1.5" aria-label={`${setup.readyCount} of 3 services connected`}>
          {setup.services.map((service) => (
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
  if (href === "/projects") {
    return pathname === "/projects" || (pathname.startsWith("/projects/") && pathname !== "/projects/new");
  }

  if (href === "/projects/new") {
    return pathname === "/projects/new";
  }

  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

function TopBar({ pageTitle, setup, onOpenCommand, compactDensity, onToggleDensity }: { pageTitle: string; setup: SetupOverview; onOpenCommand: () => void; compactDensity: boolean; onToggleDensity: () => void }) {
  return (
    <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-[var(--border)] bg-black/10 px-3 lg:h-[62px] lg:px-6">
      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <Link href="/dashboard" className="hidden hover:text-white sm:block">
          Studio
        </Link>
        <span className="hidden sm:block">/</span>
        <span className="text-[var(--text-primary)]">{pageTitle}</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onToggleDensity} title={compactDensity ? "Use comfortable density" : "Use compact density"} aria-label={compactDensity ? "Use comfortable density" : "Use compact density"} aria-pressed={compactDensity} className={`grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] bg-white/[0.035] hover:border-[var(--border-hover)] hover:text-white ${compactDensity ? "text-[var(--rose-soft)]" : "text-[var(--text-muted)]"}`}><SlidersHorizontal className="h-4 w-4" /></button>
        <button onClick={onOpenCommand} title="Open command palette" aria-label="Open command palette" className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] bg-white/[0.035] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-white">
          <Search className="h-4 w-4" />
        </button>
        {setup.isComplete ? (
          <Link href="/settings" className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.04] px-3 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-white">
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Setup</span>
          </Link>
        ) : null}
        <Link
          href={setup.isComplete ? "/projects/new" : "/settings"}
          title={setup.isComplete ? "Create a song or album." : "Complete setup before creating media."}
          className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition ${
            setup.isComplete
              ? "bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] text-white"
              : "border border-[var(--border)] bg-white/[0.025] text-[var(--text-muted)]"
          }`}
        >
          {setup.isComplete ? <Plus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          <span className="hidden sm:inline">{setup.isComplete ? "New Media" : "Setup Required"}</span>
        </Link>
      </div>
    </header>
  );
}

function FreshWorkspace({ pathname, setup }: { pathname: string; setup: SetupOverview }) {
  if (pathname.startsWith("/settings")) {
    return <SettingsWorkspace setup={setup} />;
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

  return <DashboardWorkspace setup={setup} />;
}

function DashboardWorkspace({ setup }: { setup: SetupOverview }) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-3 lg:p-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-5">
      <section className="panel relative overflow-hidden rounded-xl p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(74,110,232,0.16),transparent_34%),radial-gradient(circle_at_12%_90%,rgba(239,99,152,0.11),transparent_30%)]" />
        <motion.div className="pointer-events-none absolute right-[7%] top-[8%] h-64 w-64 opacity-[0.045]" animate={{ y: [0, -6, 0], rotate: [0, 1, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}>
          <Image src="/brand/velvet-mark.png" alt="" fill sizes="256px" className="object-contain" />
        </motion.div>
        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(239,99,152,0.26)] bg-[rgba(239,99,152,0.08)] px-3 py-1 text-xs text-[var(--rose-soft)]">
            <Sparkles className="h-3.5 w-3.5" />
            First launch
          </div>
          <h1 className="font-serif text-[42px] leading-none text-white lg:text-[52px]">Create your first AI music release.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            Start with a short song or album prompt. Velvet will prepare a blueprint for review before any generation, rendering or upload work begins.
          </p>
          <div className="mt-7 flex gap-3">
            <Link
              href={setup.isComplete ? "/projects/new" : "/settings"}
              className="flex h-11 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 font-medium"
            >
              {setup.isComplete ? "Create New Media" : "Start Setup"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!setup.isComplete ? (
              <div className="flex h-11 items-center gap-2 px-2 text-sm text-[var(--text-muted)]">
                <Lock className="h-4 w-4" />
                {setup.readyCount} of 3 services ready
              </div>
            ) : null}
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-3">
          {setupSteps.map((step, index) => (
            <Link key={step.title} href={step.href} className="rounded-lg bg-black/15 p-4 ring-1 ring-inset ring-[var(--border)] transition hover:-translate-y-0.5 hover:bg-white/[0.035] hover:ring-[var(--border-hover)]">
              <div className="tabular text-xs text-[var(--rose-soft)]">0{index + 1}</div>
              <h2 className="mt-3 text-sm font-semibold">{step.title}</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{step.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <aside className="hidden min-h-0 content-start gap-5 py-1 xl:grid">
        <EmptyPanel className="min-h-[132px]" title="Setup Required" body="Connect ChatGPT, ElevenLabs, and YouTube before creating the first release." action="Start setup" href="/settings" />
        <EmptyPanel className="min-h-[116px]" title="Generation Queue" body="Tracks appear here after a blueprint is approved." />
        <EmptyPanel className="min-h-[132px]" title="Publishing" body="Connect a channel before YouTube publishing." href="/settings/youtube" action="Connect YouTube" />
      </aside>
    </div>
  );
}

function ProjectsWorkspace() {
  const [projects, setProjects] = useState<ClientProject[] | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((response) => response.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => setProjects([]));
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

function ProjectDetailWorkspace({ id }: { id: string }) {
  const setup = useSetupOverview();
  const [project, setProject] = useState<ClientProject | null>(null);
  const [jobs, setJobs] = useState<ClientJob[]>([]);
  const [usage, setUsage] = useState<ClientUsage[]>([]);
  const [message, setMessage] = useState("Review the blueprint before running paid generation.");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"release" | "jobs" | "usage">("release");
  const [saveState, setSaveState] = useState("Saved");
  const [editRevision, setEditRevision] = useState(0);
  const [privacy, setPrivacy] = useState<"private" | "unlisted" | "public">("private");
  const [auditionTrack, setAuditionTrack] = useState<StudioTrack | null>(null);
  const [sequenceOpen, setSequenceOpen] = useState(false);
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

  async function saveStudioState(tracks: StudioTrack[], production: StudioProduction) {
    const response = await fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tracks, production }) });
    if (!response.ok) return emitToast("Timeline changes could not be saved.", "error");
    emitToast("Album timeline saved.", "success");
    setSequenceOpen(false);
    await loadProject();
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
          <WorkflowButton icon={<WandSparkles className="h-4 w-4" />} label="Generate" active={busyAction === "music"} onClick={() => runAction("music")} disabled={!["approved", "generating"].includes(project.status)} />
          <WorkflowButton icon={<Clapperboard className="h-4 w-4" />} label="Render" active={busyAction === "render"} onClick={() => runAction("render")} disabled={!project.generatedTracks?.length} />
          <WorkflowButton icon={<Upload className="h-4 w-4" />} label="Upload" active={busyAction === "upload"} onClick={() => runAction("upload")} disabled={!project.render?.videoPath} />
        </div>

        <div className="mt-3 overflow-hidden rounded-lg bg-black/15 ring-1 ring-inset ring-[var(--border)]">
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-[var(--text-secondary)]">
            <span className="truncate">{message}</span>
            <span className="tabular text-[var(--text-muted)]">{workflowProgress(project.status)}%</span>
          </div>
          <motion.div className="h-0.5 bg-[linear-gradient(90deg,var(--cyan),var(--violet),var(--rose))]" initial={false} animate={{ width: `${workflowProgress(project.status)}%` }} transition={{ type: "spring", stiffness: 120, damping: 22 }} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3"><SectionTitle label="Tracks & Prompts" icon={<Music2 className="h-4 w-4" />} /><div className="flex items-center gap-1"><button onClick={() => setFocusMode((current) => !current)} title={focusMode ? "Exit focus mode" : "Focus studio"} aria-label={focusMode ? "Exit focus mode" : "Focus studio"} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-white/[.05] hover:text-white"><Focus className="h-3.5 w-3.5" /></button><button onClick={() => setSequenceOpen(true)} title="Open album timeline" aria-label="Open album timeline" className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-white/[.05] hover:text-white"><SlidersHorizontal className="h-3.5 w-3.5" /></button><button onClick={() => setGenerationOpen(true)} title="Open generation center" aria-label="Open generation center" className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-white/[.05] hover:text-white"><ListRestart className="h-3.5 w-3.5" /></button><span className="ml-1 text-[11px] text-[var(--text-muted)]">{project.generatedTracks?.length ?? 0} generated</span></div></div>
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
            <div className="grid grid-cols-3 gap-2 pt-1"><ReferenceUploader projectId={id} onUploaded={loadProject} /><button onClick={() => setCreativeOpen(true)} title="Title and thumbnail variants" aria-label="Title and thumbnail variants" className="flex h-9 items-center justify-center gap-2 rounded-lg bg-white/[.04] px-2 text-xs text-[var(--text-secondary)] hover:bg-white/[.07] hover:text-white"><ImageIcon className="h-3.5 w-3.5" />Variants</button><a href={`/api/projects/${id}/archive`} title="Download project archive" className="flex h-9 items-center justify-center gap-2 rounded-lg bg-white/[.04] px-2 text-xs text-[var(--text-secondary)] hover:bg-white/[.07] hover:text-white"><Download className="h-3.5 w-3.5" />Archive</a></div>
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
      <SequenceDrawer open={sequenceOpen} onClose={() => setSequenceOpen(false)} tracks={project.blueprint?.tracks ?? []} production={project.production} onSave={saveStudioState} />
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

function SettingsWorkspace({ setup }: { setup: SetupOverview }) {
  const [youtubeStatus, setYoutubeStatus] = useState<string | null>(null);
  const [activeSetupStep, setActiveSetupStep] = useState<"services" | "youtube" | "review">("services");
  const [activeService, setActiveService] = useState<"openai" | "elevenlabs">("openai");
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
  const settingsServices = setup.services.map((service) => ({
    ...service,
    status: providerStatus[service.label === "ChatGPT" ? "openai" : service.label === "ElevenLabs" ? "elevenlabs" : "youtube"]
  }));

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
    <div className="min-h-0 flex-1 overflow-hidden p-3 lg:p-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-5">
        <section className="panel settings-primary rounded-xl p-4">
          <SectionTitle label="Onboarding" />
          <p className="settings-intro mt-2 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
            Connect only what Velvet needs to create and publish: ChatGPT for planning, ElevenLabs for music, and YouTube for private review uploads. Model and format defaults are handled automatically.
          </p>

          <div className="settings-progress mt-3 grid grid-cols-[120px_1fr] gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-white/[0.035] p-3">
              <div className="text-xs text-[var(--text-muted)]">Setup progress</div>
              <div className="mt-2 font-serif text-[34px] leading-none">{setup.readyCount} / 3</div>
              <div className="mt-2 h-1.5 rounded-full bg-black/25">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--blue),var(--rose))] transition-[width] duration-500"
                  style={{ width: `${(setup.readyCount / 3) * 100}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["services", "01", "AI + Music"],
                ["youtube", "02", "YouTube"],
                ["review", "03", "Advanced"]
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
                    placeholder="sk-..."
                    secret
                    value={setupForm.openaiApiKey}
                    onChange={(value) => updateSetupForm("openaiApiKey", value)}
                    help="Used for song and album planning, prompt rewriting, artwork prompts, and metadata."
                  />
                  <div className="flex gap-2">
                    <button onClick={() => validateProvider("openai")} className="h-8 rounded-lg border border-[var(--border)] bg-white/[0.05] px-3 text-xs text-[var(--text-secondary)]">
                      Test ChatGPT key
                    </button>
                  </div>
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
                    placeholder="Enter key"
                    secret
                    value={setupForm.elevenLabsApiKey}
                    onChange={(value) => updateSetupForm("elevenLabsApiKey", value)}
                    help="Used only after you approve track prompts."
                  />
                  <div className="flex gap-2">
                    <button onClick={() => validateProvider("elevenlabs")} className="h-8 rounded-lg border border-[var(--border)] bg-white/[0.05] px-3 text-xs text-[var(--text-secondary)]">
                      Check key & usage
                    </button>
                  </div>
                  <p className="setup-card-note text-xs leading-5 text-[var(--text-muted)]">Velvet uses the default ElevenLabs music model and reads quota usage from the key.</p>
                  <StatusLine status={providerStatus.elevenlabs} />
                </SetupCard>
                )}
                </motion.div>
              </div>
            ) : null}

            {activeSetupStep === "youtube" ? (
              <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-3">
                <SetupCard
                  icon={<Youtube className="h-5 w-5" />}
                  title="YouTube"
                  body="Connect with Google OAuth. Velvet will request permission to upload videos and read channel identity."
                  status={formatProviderStatus(providerStatus.youtube, setup.services[2]?.ready)}
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

        </section>
          <aside className="hidden space-y-4 xl:block">
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
  const [mediaType, setMediaType] = useState<"song" | "album">("song");
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
    <div className="min-h-0 flex-1 overflow-hidden p-3 lg:p-5">
      <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-4 xl:grid-cols-[1fr_340px] xl:gap-5">
        <section className="panel rounded-xl p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rose-soft)]">New media</div>
          <h1 className="mt-2 font-serif text-[48px] leading-none">Describe the song or album.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Choose the release type, then write the prompt. Mood, instrumentation, length and intended YouTube style are enough to begin.
          </p>
          <div className="mt-5 grid h-12 grid-cols-2 rounded-xl border border-[var(--border)] bg-black/20 p-1">
            {(["song", "album"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMediaType(type)}
                className={`rounded-lg text-sm font-medium capitalize transition ${
                  mediaType === type
                    ? "bg-[rgba(239,99,152,0.18)] text-white shadow-[inset_0_0_18px_rgba(239,99,152,0.12)]"
                    : "text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-white"
                }`}
                aria-pressed={mediaType === type}
              >
                {type}
              </button>
            ))}
          </div>
          <textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            className="mt-4 min-h-[204px] w-full resize-none rounded-xl border border-[var(--border)] bg-black/20 p-4 text-sm leading-6 text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]"
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
              className="flex h-12 shrink-0 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create Blueprint"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
        <aside className="hidden space-y-4 xl:block">
          <EmptyPanel title="Release type" body="Songs create one-track blueprints. Albums create a multi-track plan with YouTube-ready metadata." />
          <EmptyPanel title="Optional" body="After the prompt, Velvet can ask for length, track count, vocals and workflow mode only if needed." />
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
  if (pathname === "/projects/new") {
    return "New Media";
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
