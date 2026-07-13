"use client";

import {
  ArrowRight,
  ChevronDown,
  Circle,
  Database,
  KeyRound,
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
import { navItems, onboardingSteps, safetyDefaults, setupSteps } from "@/lib/app-data";
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

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="panel flex min-h-0 flex-col rounded-[22px] px-4 py-6">
      <div className="px-3">
        <Link href="/dashboard" className="block">
          <div className="font-serif text-[38px] leading-none tracking-wide text-[#f4edf4]">Velvet Coda</div>
          <div className="mt-2 text-sm font-medium tracking-[0.18em] text-[var(--rose-soft)]">AI ALBUM FOUNDRY</div>
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
          {["ChatGPT", "ElevenLabs", "YouTube"].map((service) => (
            <div key={service} className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)] last:mb-0">
              <span>{service}</span>
              <span className="rounded-full border border-[var(--border)] bg-black/10 px-2 py-0.5 text-[var(--text-muted)]">Not connected</span>
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
          href="/projects/new"
          className="flex h-9 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-4 text-sm font-medium shadow-[0_10px_35px_rgba(239,99,152,0.26)]"
        >
          <Plus className="h-4 w-4" />
          Create Album
        </Link>
      </div>
    </header>
  );
}

function FreshWorkspace({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/settings")) {
    return <SettingsWorkspace />;
  }

  if (pathname === "/projects") {
    return <ProjectsWorkspace />;
  }

  return <DashboardWorkspace />;
}

function DashboardWorkspace() {
  return (
    <div className="velvet-scroll grid min-h-0 flex-1 grid-cols-[minmax(0,1.05fr)_390px] gap-5 overflow-y-auto p-5">
      <section className="panel relative overflow-hidden rounded-xl p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_14%,rgba(74,110,232,0.2),transparent_32%),radial-gradient(circle_at_18%_86%,rgba(239,99,152,0.16),transparent_28%)]" />
        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(239,99,152,0.26)] bg-[rgba(239,99,152,0.08)] px-3 py-1 text-xs text-[var(--rose-soft)]">
            <Sparkles className="h-3.5 w-3.5" />
            First launch
          </div>
          <h1 className="font-serif text-[64px] leading-[0.95] text-white">Create your first AI jazz album.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            Start with a short album brief. Velvet Coda will prepare a blueprint for review before any generation, rendering or upload work begins.
          </p>
          <div className="mt-7 flex gap-3">
            <Link
              href="/projects/new"
              className="flex h-12 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 font-medium"
            >
              Create Album
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/settings" className="flex h-12 items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.05] px-5 text-[var(--text-secondary)]">
              Start Setup
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

      <aside className="space-y-4">
        <EmptyPanel title="Current Project" body="No album has been created yet." action="Start with a brief" href="/projects/new" />
        <EmptyPanel title="Generation Queue" body="Queue is empty. Tracks appear here after a blueprint is approved." />
        <EmptyPanel title="Publishing" body="YouTube publishing is unavailable until a channel is connected." href="/settings/youtube" action="Connect YouTube" />
      </aside>
    </div>
  );
}

function ProjectsWorkspace() {
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

function SettingsWorkspace() {
  return (
    <div className="velvet-scroll min-h-0 flex-1 overflow-y-auto p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-5">
        <section className="panel rounded-xl p-5">
          <SectionTitle label="Onboarding" />
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Connect the minimum services Velvet Coda needs: ChatGPT for creative planning, ElevenLabs for music, and YouTube for private review uploads. Secrets are shown here as setup fields only until the secure server-side vault is implemented.
          </p>

          <div className="mt-5 grid grid-cols-5 gap-2">
            {onboardingSteps.map((step, index) => (
              <div key={step} className="rounded-lg border border-[var(--border)] bg-white/[0.035] p-3">
                <div className="tabular text-xs text-[var(--rose-soft)]">0{index + 1}</div>
                <div className="mt-2 text-xs font-medium leading-4">{step}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            <SetupCard
              icon={<KeyRound className="h-5 w-5" />}
              title="ChatGPT / OpenAI"
              body="Used for album blueprints, prompt revisions, artwork prompts, image generation and YouTube metadata."
            >
              <Field label="OpenAI API key" placeholder="sk-..." secret />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Planning model" placeholder="gpt-4.1" />
                <Field label="Image model" placeholder="gpt-image-1" />
              </div>
            </SetupCard>

            <SetupCard
              icon={<Music2 className="h-5 w-5" />}
              title="ElevenLabs"
              body="Used only when approved track prompts are ready for music generation."
            >
              <Field label="ElevenLabs API key" placeholder="Enter key" secret />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Music model" placeholder="eleven-music" />
                <Field label="Output format" placeholder="mp3_44100_128" />
              </div>
            </SetupCard>

            <SetupCard
              icon={<Youtube className="h-5 w-5" />}
              title="YouTube"
              body="Used for private uploads, thumbnail upload, metadata and scheduled publishing after approval."
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="Google client ID" placeholder="Client ID" />
                <Field label="Google client secret" placeholder="Client secret" secret />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Redirect URI" placeholder="http://localhost:3000/api/youtube/callback" />
                <label className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Default privacy
                  <select className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[#101122] px-3 text-sm normal-case tracking-normal text-white outline-none">
                    <option>Private</option>
                    <option>Unlisted</option>
                    <option>Scheduled</option>
                  </select>
                </label>
              </div>
            </SetupCard>

            <SetupCard
              icon={<Database className="h-5 w-5" />}
              title="Storage & worker"
              body="Needed later for generated audio, images, videos, logs and long-running jobs."
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="Supabase URL" placeholder="https://..." />
                <Field label="Storage bucket" placeholder="velvet-coda-assets" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Database URL" placeholder="postgres://..." secret />
                <Field label="Worker secret" placeholder="Enter secret" secret />
              </div>
            </SetupCard>
          </div>

          <div className="mt-5 rounded-xl border border-[rgba(239,99,152,0.22)] bg-[rgba(239,99,152,0.06)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="h-4 w-4 text-[var(--rose-soft)]" />
              Server-side only
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              This screen defines the onboarding flow. Real keys must be encrypted and stored server-side before any request is made.
            </p>
            <button className="mt-4 h-11 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 text-sm font-medium">
              Save Setup
            </button>
          </div>
        </section>
        <aside className="space-y-4">
          <aside className="panel rounded-xl p-5">
            <SectionTitle label="Required Services" />
            <div className="mt-4 space-y-3">
              {["ChatGPT / OpenAI", "ElevenLabs", "YouTube"].map((item) => (
                <div key={item} className="rounded-lg border border-[var(--border)] bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-3 text-sm font-medium">
                    {item}
                    <span className="rounded-full border border-[var(--border)] bg-black/10 px-2 py-0.5 text-[11px] text-[var(--text-muted)]">Required</span>
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

function NewProjectFlow() {
  return (
    <div className="velvet-scroll min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mx-auto grid max-w-[1120px] grid-cols-[1fr_340px] gap-5">
        <section className="panel rounded-xl p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rose-soft)]">New album</div>
          <h1 className="mt-2 font-serif text-[48px] leading-none">Describe the album.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Keep it simple. Mood, instrumentation, length and intended YouTube style are enough to begin.
          </p>
          <textarea
            className="mt-5 min-h-[260px] w-full resize-none rounded-xl border border-[var(--border)] bg-black/20 p-4 text-sm leading-6 text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]"
            placeholder="Example: A moody late-night jazz album with slow saxophone, intimate piano and brushed drums. Instrumental, cinematic, elegant, and made for a long-form YouTube release."
            aria-label="Album brief"
          />
          <div className="mt-5 flex justify-end">
            <button className="flex h-12 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 font-medium">
              Create Blueprint
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
        <aside className="space-y-4">
          <EmptyPanel title="Optional" body="After the brief, Velvet Coda can ask for length, track count, vocals and workflow mode only if needed." />
          <EmptyPanel title="Before generation" body="You will review the blueprint first. ChatGPT and ElevenLabs calls stay blocked until approved." />
        </aside>
      </div>
    </div>
  );
}

function EmptyPanel({ title, body, action, href }: { title: string; body: string; action?: string; href?: string }) {
  const content = (
    <article className="panel rounded-xl p-4">
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
  children
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-white/[0.035] p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-black/15 text-[var(--rose-soft)]">
          {icon}
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">{body}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </article>
  );
}

function Field({ label, placeholder, secret = false }: { label: string; placeholder: string; secret?: boolean }) {
  return (
    <label className="block text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
      {label}
      <input
        type={secret ? "password" : "text"}
        className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-black/15 px-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]"
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
  if (pathname.startsWith("/settings")) {
    return "Settings";
  }
  return "Welcome";
}
