"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, CalendarClock, Check, ChevronDown, Clock3, ExternalLink, Lock, Send, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { emitToast } from "@/components/toast-system";
import { useSetupOverview } from "@/components/setup-controller";
import { ProjectArtwork, StatusPill } from "@/components/studio-chrome";
import { cachedJson, peekCachedJson } from "@/components/data-cache";

type PublishingProject = { id: string; title: string; status: string; render?: { videoPath?: string; videoStoragePath?: string } };
type PublishingJob = { id: string; projectId?: string; status: string; message: string; payload?: { privacy?: string; scheduledPublishAt?: string } };
type PublishingUpload = { id: string; projectId: string; projectTitle?: string; url?: string; privacy: string; status: string; createdAt: string };
type PublishingData = { projects: PublishingProject[]; schedules: PublishingJob[]; recent: PublishingUpload[] };
type AnalyticsData = { summary: { successfulUploads: number; failedUploads: number; scheduledUploads: number; successRate: number; publicUploads: number; unlistedUploads: number; privateUploads: number }; months: Array<{ key: string; label: string; success: number; failed: number }>; uploads: PublishingUpload[]; failures: Array<{ id: string; projectId?: string; message: string; createdAt: string }> };

export function PublishingWorkspace() {
  const setup = useSetupOverview();
  const [data, setData] = useState<PublishingData | null>(peekCachedJson<PublishingData>("/api/publishing") ?? null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(peekCachedJson<AnalyticsData>("/api/analytics/uploads") ?? null);
  const [projectId, setProjectId] = useState("");
  const [privacy, setPrivacy] = useState<"private" | "unlisted" | "public">("private");
  const [scheduledAt, setScheduledAt] = useState(() => defaultScheduleValue());
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const body = await cachedJson<PublishingData>("/api/publishing", true); setData(body); setProjectId((current) => current || body.projects?.[0]?.id || ""); }, []);
  const loadAnalytics = useCallback(async () => { const body = await cachedJson<AnalyticsData>("/api/analytics/uploads", true); setAnalytics(body); }, []);
  useEffect(() => { load().catch(() => setData({ projects: [], schedules: [], recent: [] })); window.addEventListener("velvet:studio-update", load); return () => window.removeEventListener("velvet:studio-update", load); }, [load]);
  useEffect(() => { loadAnalytics().catch(() => setAnalytics(null)); window.addEventListener("velvet:studio-update", loadAnalytics); return () => window.removeEventListener("velvet:studio-update", loadAnalytics); }, [loadAnalytics]);

  async function schedule() {
    setBusy(true);
    const response = await fetch("/api/publishing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, privacy, scheduledPublishAt: new Date(scheduledAt).toISOString() }) });
    const body = await response.json(); setBusy(false);
    emitToast(response.ok ? "YouTube upload scheduled." : body.error ?? "Upload could not be scheduled.", response.ok ? "success" : "error");
    if (response.ok) await load();
  }

  async function cancel(jobId: string) {
    const response = await fetch("/api/publishing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, action: "cancel" }) });
    const body = await response.json(); emitToast(response.ok ? "Scheduled upload cancelled." : body.error ?? "Schedule could not be cancelled.", response.ok ? "success" : "error");
    if (response.ok) await load();
  }

  if (!data) return <WorkspaceSkeleton label="Loading scheduler" />;
  const projectById = new Map(data.projects.map((project) => [project.id, project]));
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-3 lg:p-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-5">
      <section className="panel min-h-0 rounded-xl p-5">
        <div className="flex items-center justify-between"><SectionLabel icon={<CalendarClock className="h-4 w-4" />} label="Publishing" /><StatusPill status={`${data.schedules.length} scheduled`} /></div>
        <div className="mt-5 grid grid-cols-[180px_minmax(0,1fr)] gap-5">
          <div><ProjectArtwork title={projectById.get(projectId)?.title ?? "Velvet publishing"} /></div>
          <div className="min-w-0 space-y-4">
            <ProjectPicker projects={data.projects} value={projectId} onChange={setProjectId} />
            <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Publish time<input aria-label="Publish time" type="datetime-local" value={scheduledAt} min={minimumScheduleValue()} onChange={(event) => setScheduledAt(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg bg-black/20 px-3 text-sm normal-case text-white ring-1 ring-inset ring-[var(--border)] [color-scheme:dark] focus:ring-[var(--border-active)]" /></label>
            <div><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">YouTube privacy</div><div className="mt-1.5 grid h-11 grid-cols-3 rounded-lg bg-black/20 p-1 ring-1 ring-inset ring-[var(--border)]">{(["private", "unlisted", "public"] as const).map((option) => <button key={option} onClick={() => setPrivacy(option)} aria-pressed={privacy === option} className={`rounded-md text-xs font-medium capitalize ${privacy === option ? "bg-[rgba(239,99,152,.14)] text-white shadow-[inset_0_0_0_1px_rgba(239,99,152,.3)]" : "text-[var(--text-muted)] hover:text-white"}`}>{option}</button>)}</div></div>
            <button onClick={schedule} disabled={!projectId || busy || !setup.canPublish} title={setup.canPublish ? "Schedule this YouTube upload." : "Connect YouTube in Settings before publishing."} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] text-sm font-medium disabled:cursor-not-allowed disabled:opacity-35"><Send className="h-4 w-4" />{busy ? "Scheduling" : setup.canPublish ? "Schedule upload" : "Connect YouTube to publish"}</button>
          </div>
        </div>
        <div className="mt-6 border-t border-[var(--border)] pt-4"><div className="flex items-center justify-between"><SectionLabel icon={<Clock3 className="h-4 w-4" />} label="Upcoming" /><span className="text-[11px] text-[var(--text-muted)]">Local time</span></div>
          <div className="mt-3 grid gap-2">{data.schedules.length ? data.schedules.slice(0, 4).map((job) => <motion.div layout key={job.id} className="grid grid-cols-[minmax(0,1fr)_150px_78px] items-center gap-3 rounded-lg bg-white/[.025] px-3 py-2.5 ring-1 ring-inset ring-[var(--border)]"><div className="min-w-0"><div className="truncate text-sm font-medium text-white">{projectById.get(job.projectId ?? "")?.title ?? "Scheduled release"}</div><div className="mt-1 text-[10px] capitalize text-[var(--text-muted)]">{job.payload?.privacy ?? "private"} upload</div></div><div className="text-xs tabular text-[var(--text-secondary)]">{formatSchedule(job.payload?.scheduledPublishAt)}</div><button onClick={() => cancel(job.id)} className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-white/[.04] text-xs text-[var(--danger)] hover:bg-white/[.07]"><X className="h-3 w-3" />Cancel</button></motion.div>) : <EmptyLine icon={<CalendarClock className="h-4 w-4" />} text="No uploads are scheduled." />}</div>
        </div>
      </section>
      <aside className="panel hidden min-h-0 rounded-xl p-5 xl:block">
        <SectionLabel icon={<BarChart3 className="h-4 w-4" />} label="Performance" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Success" value={`${analytics?.summary.successRate ?? 0}%`} tone="success" />
          <Metric label="Uploads" value={String(analytics?.summary.successfulUploads ?? 0)} tone="rose" />
        </div>
        <div className="mt-4"><SectionLabel icon={<ShieldCheck className="h-4 w-4" />} label="Recent publishing" /></div>
        <div className="mt-3 grid gap-2">{data.recent.length ? data.recent.slice(0, 4).map((upload) => <a key={upload.id} href={upload.url} target="_blank" rel="noreferrer" className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-white/[.025] p-2.5 ring-1 ring-inset ring-[var(--border)] hover:bg-white/[.045]"><div className="h-10 w-10"><ProjectArtwork title={upload.projectTitle ?? upload.projectId} compact /></div><div className="min-w-0"><div className="truncate text-xs font-medium text-white">{upload.projectTitle ?? "YouTube release"}</div><div className="mt-1 text-[10px] text-[var(--text-muted)]">{new Date(upload.createdAt).toLocaleDateString()} / {upload.privacy}</div></div><ExternalLink className="h-3.5 w-3.5 text-[var(--success)]" /></a>) : <EmptyLine icon={<Lock className="h-4 w-4" />} text="No prior uploads." />}</div>
        <Link href="/history" className="mt-3 flex h-9 items-center justify-center rounded-lg bg-white/[.04] text-xs text-[var(--text-secondary)] hover:bg-white/[.07] hover:text-white">Open full history</Link>
      </aside>
    </div>
  );
}

export function AnalyticsWorkspace() {
  const [data, setData] = useState<AnalyticsData | null>(peekCachedJson<AnalyticsData>("/api/analytics/uploads") ?? null);
  useEffect(() => { const load = () => cachedJson<AnalyticsData>("/api/analytics/uploads", true).then(setData).catch(() => undefined); load(); window.addEventListener("velvet:studio-update", load); return () => window.removeEventListener("velvet:studio-update", load); }, []);
  if (!data) return <WorkspaceSkeleton label="Loading analytics" />;
  const max = Math.max(1, ...data.months.map((month) => month.success + month.failed));
  const privacyTotal = Math.max(1, data.summary.successfulUploads);
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-3 lg:p-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-5">
      <section className="panel min-h-0 rounded-xl p-5"><SectionLabel icon={<BarChart3 className="h-4 w-4" />} label="Upload analytics" />
        <div className="mt-4 grid grid-cols-4 gap-2"><Metric label="Successful" value={String(data.summary.successfulUploads)} tone="success" /><Metric label="Failed" value={String(data.summary.failedUploads)} tone="danger" /><Metric label="Success rate" value={`${data.summary.successRate}%`} tone="rose" /><Metric label="Scheduled" value={String(data.summary.scheduledUploads)} tone="neutral" /></div>
        <div className="mt-4 rounded-xl bg-black/15 p-4 ring-1 ring-inset ring-[var(--border)]"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[.12em] text-white">Upload outcomes</span><div className="flex gap-3 text-[10px] text-[var(--text-muted)]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[var(--success)]" />Success</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[var(--danger)]" />Failed</span></div></div><div className="mt-5 grid h-[190px] grid-cols-6 items-end gap-3">{data.months.map((month) => <div key={month.key} className="grid h-full grid-rows-[1fr_auto] gap-2"><div className="flex items-end justify-center gap-1"><motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(month.success ? 12 : 2, (month.success / max) * 150)}px` }} className="w-5 rounded-t bg-[var(--success)] opacity-85" /><motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(month.failed ? 12 : 2, (month.failed / max) * 150)}px` }} className="w-3 rounded-t bg-[var(--danger)] opacity-75" /></div><div className="text-center text-[10px] uppercase text-[var(--text-muted)]">{month.label}</div></div>)}</div></div>
        <div className="mt-4"><SectionLabel icon={<Check className="h-4 w-4" />} label="Successful uploads" /><div className="mt-3 grid gap-2">{data.uploads.length ? data.uploads.slice(0, 5).map((upload) => <div key={upload.id} className="grid grid-cols-[minmax(0,1fr)_110px_90px_28px] items-center gap-3 rounded-lg bg-white/[.025] px-3 py-2.5 ring-1 ring-inset ring-[var(--border)]"><Link href={`/projects/${upload.projectId}`} className="truncate text-sm font-medium text-white">{upload.projectTitle ?? upload.projectId}</Link><span className="text-xs capitalize text-[var(--text-muted)]">{upload.privacy}</span><span className="text-xs tabular text-[var(--text-muted)]">{new Date(upload.createdAt).toLocaleDateString()}</span><a href={upload.url} target="_blank" rel="noreferrer" title="Open YouTube video" className="grid h-7 w-7 place-items-center rounded-md text-[var(--success)] hover:bg-white/[.06]"><ExternalLink className="h-3.5 w-3.5" /></a></div>) : <EmptyLine icon={<BarChart3 className="h-4 w-4" />} text="Successful uploads will appear here." />}</div></div>
      </section>
      <aside className="panel hidden min-h-0 rounded-xl p-5 xl:block"><SectionLabel icon={<ShieldCheck className="h-4 w-4" />} label="Privacy mix" /><div className="mt-5 space-y-4">{[["Private", data.summary.privateUploads, "var(--violet)"], ["Unlisted", data.summary.unlistedUploads, "var(--cyan)"], ["Public", data.summary.publicUploads, "var(--rose)"]].map(([label, count, color]) => <div key={String(label)}><div className="flex items-center justify-between text-xs"><span className="text-[var(--text-secondary)]">{label}</span><span className="tabular text-white">{count}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/25"><motion.div initial={{ width: 0 }} animate={{ width: `${(Number(count) / privacyTotal) * 100}%` }} className="h-full rounded-full" style={{ backgroundColor: String(color) }} /></div></div>)}</div><div className="mt-7"><SectionLabel icon={<X className="h-4 w-4" />} label="Failed attempts" /><div className="mt-3 grid gap-2">{data.failures.length ? data.failures.slice(0, 4).map((failure) => <div key={failure.id} className="rounded-lg bg-[rgba(219,99,114,.05)] p-3 ring-1 ring-inset ring-[rgba(219,99,114,.18)]"><div className="text-xs text-[var(--danger)]">Upload failed</div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--text-muted)]">{failure.message}</p></div>) : <div className="rounded-lg bg-[rgba(88,182,168,.06)] p-3 text-xs text-[var(--success)] ring-1 ring-inset ring-[rgba(88,182,168,.18)]">No failed upload attempts.</div>}</div></div></aside>
    </div>
  );
}

function ProjectPicker({ projects, value, onChange }: { projects: PublishingProject[]; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null); const selected = projects.find((project) => project.id === value);
  useEffect(() => { if (!open) return; const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); }; window.addEventListener("mousedown", close); return () => window.removeEventListener("mousedown", close); }, [open]);
  return <div ref={ref} className="relative"><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Rendered release</div><button aria-label="Rendered release" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="mt-1.5 flex h-11 w-full items-center gap-3 rounded-lg bg-black/20 px-3 text-left ring-1 ring-inset ring-[var(--border)] hover:ring-[var(--border-hover)]"><span className="min-w-0 flex-1 truncate text-sm text-white">{selected?.title ?? "No rendered releases"}</span><ChevronDown className={`h-4 w-4 text-[var(--text-muted)] transition ${open ? "rotate-180" : ""}`} /></button><AnimatePresence>{open && projects.length ? <motion.div role="listbox" aria-label="Rendered releases" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="panel absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg bg-[#111426] p-1">{projects.slice(0, 6).map((project) => <button key={project.id} role="option" aria-selected={project.id === value} onClick={() => { onChange(project.id); setOpen(false); }} className={`flex h-10 w-full items-center gap-2 rounded-md px-3 text-left text-xs ${project.id === value ? "bg-[rgba(239,99,152,.12)] text-white" : "text-[var(--text-secondary)] hover:bg-white/[.05] hover:text-white"}`}><span className="min-w-0 flex-1 truncate">{project.title}</span>{project.id === value ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : null}</button>)}</motion.div> : null}</AnimatePresence></div>;
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) { return <div className="flex items-center gap-2 text-[var(--rose-soft)]">{icon}<h1 className="text-xs font-semibold uppercase tracking-[.13em] text-white">{label}</h1></div>; }
function Metric({ label, value, tone }: { label: string; value: string; tone: "success" | "danger" | "rose" | "neutral" }) { const color = { success: "text-[var(--success)]", danger: "text-[var(--danger)]", rose: "text-[var(--rose-soft)]", neutral: "text-white" }[tone]; return <div className="rounded-lg bg-white/[.025] p-3 ring-1 ring-inset ring-[var(--border)]"><div className="text-[9px] uppercase tracking-[.12em] text-[var(--text-muted)]">{label}</div><motion.div key={value} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className={`mt-2 text-2xl font-semibold tabular ${color}`}>{value}</motion.div></div>; }
function EmptyLine({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex h-12 items-center gap-3 rounded-lg bg-white/[.02] px-3 text-xs text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border)]"><span className="text-[var(--rose-soft)]">{icon}</span>{text}</div>; }
function WorkspaceSkeleton({ label }: { label: string }) { return <div aria-label={label} className="min-h-0 flex-1 p-5"><section className="panel h-full rounded-xl p-5"><div className="studio-skeleton h-4 w-36 rounded" /><div className="mt-5 grid grid-cols-4 gap-2">{[1,2,3,4].map((item) => <div key={item} className="studio-skeleton h-20 rounded-lg" />)}</div><div className="studio-skeleton mt-4 h-52 rounded-xl" /></section></div>; }
function defaultScheduleValue() { const date = new Date(Date.now() + 24 * 60 * 60 * 1000); date.setMinutes(0, 0, 0); return localDateTime(date); }
function minimumScheduleValue() { return localDateTime(new Date(Date.now() + 2 * 60 * 1000)); }
function localDateTime(date: Date) { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16); }
function formatSchedule(value?: string) { return value ? new Date(value).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Next worker run"; }
