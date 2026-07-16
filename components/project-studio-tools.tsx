"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, ArrowLeft, Check, Clock3, Download, Eye, FileAudio, ImageIcon, Layers3, Loader2, Music2, Pause, Play, RefreshCw, RotateCcw, Sparkles, Upload, X } from "lucide-react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { StatusPill, Waveform } from "@/components/studio-chrome";
import { formatDuration } from "@/lib/time";
import { usePlayerStore } from "@/store/player-store";
import { emitToast } from "@/components/toast-system";

export type StudioTrack = { title: string; durationSeconds: number; prompt: string; mood: string };
export type StudioVersion = { id?: string; title: string; durationSeconds: number; version?: number; prompt?: string; createdAt?: string; approvedAt?: string };
export type StudioJob = { id: string; type: string; status: string; message: string; updatedAt?: string };
export type StudioProduction = {
  gapSeconds: number;
  fadeSeconds: number;
  targetLufs: number;
  stylePreset?: string;
  scheduledPublishAt?: string;
  artworkAssetId?: string;
  visualPreset?: "clean" | "velvet" | "rose-film" | "midnight" | "noir" | "mono";
  filterIntensity?: number;
  overlayOpacity?: number;
  grain?: number;
  flicker?: number;
  vignette?: number;
  dust?: number;
};
export type StudioArtwork = { id: string; name: string; kind: "audio" | "artwork"; filePath: string; storagePath?: string; createdAt: string };
const DEFAULT_STUDIO_PRODUCTION: StudioProduction = { gapSeconds: 1.5, fadeSeconds: 0.8, targetLufs: -14, stylePreset: "Studio master", visualPreset: "velvet", filterIntensity: 70, overlayOpacity: 55, grain: 18, flicker: 8, vignette: 28, dust: 5 };

function Drawer({ open, onClose, title, icon, children, width = "max-w-[560px]" }: { open: boolean; onClose: () => void; title: string; icon: React.ReactNode; children: React.ReactNode; width?: string }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[70] flex justify-end bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
          <motion.section role="dialog" aria-modal="true" aria-label={title} className={`panel studio-drawer h-full w-full ${width} overflow-hidden rounded-none border-y-0 border-r-0 p-5`} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 28, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}>
            <div className="flex h-10 items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-white"><span className="text-[var(--rose-soft)]">{icon}</span>{title}</div>
              <button onClick={onClose} title="Close" aria-label={`Close ${title}`} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="h-[calc(100%-40px)] min-h-0">{children}</div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function TrackAuditionDrawer({ open, onClose, projectId, projectTitle, track, versions, selectedVersion, onRefresh, onApplyPrompt }: { open: boolean; onClose: () => void; projectId: string; projectTitle: string; track: StudioTrack | null; versions: StudioVersion[]; selectedVersion?: StudioVersion; onRefresh: () => Promise<void>; onApplyPrompt: (prompt: string) => Promise<void> }) {
  const { activeTrack, isPlaying, loadTrack, togglePlaying } = usePlayerStore();
  const [activeVersion, setActiveVersion] = useState<StudioVersion | undefined>(selectedVersion ?? versions.at(-1));
  const [prompt, setPrompt] = useState(track?.prompt ?? "");
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { setActiveVersion(selectedVersion ?? versions.at(-1)); setPrompt(track?.prompt ?? ""); setExplanation(""); }, [selectedVersion, track, versions]);
  if (!track) return null;
  const isCurrent = activeTrack?.title === track.title && activeTrack?.version === activeVersion?.version;
  const sourceUrl = activeVersion ? `/api/audio?projectId=${encodeURIComponent(projectId)}&trackId=${encodeURIComponent(activeVersion.id ?? "")}&title=${encodeURIComponent(track.title)}` : undefined;

  async function versionAction(type: "select" | "approve") {
    if (!activeVersion) return;
    setBusy(type);
    const response = await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionAction: { type, title: track!.title, versionId: activeVersion.id ?? String(activeVersion.version) } }) });
    setBusy(null);
    if (!response.ok) return emitToast("Version could not be updated.", "error");
    emitToast(type === "approve" ? "Track version approved." : "Active version changed.", "success");
    await onRefresh();
  }

  async function refine() {
    setBusy("refine");
    const response = await fetch("/api/prompts/refine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, prompt }) });
    const data = await response.json();
    setBusy(null);
    if (!response.ok) return emitToast(data.error ?? "Prompt refinement failed.", "error");
    setPrompt(data.prompt); setExplanation(data.explanation); emitToast("Refined prompt ready to review.", "success");
  }

  async function regenerate() {
    setBusy("regenerate");
    const response = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, type: "music", payload: { trackTitle: track!.title } }) });
    setBusy(null);
    emitToast(response.ok ? "Track regeneration queued." : "Track could not be queued.", response.ok ? "success" : "error");
    await onRefresh();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Track audition" icon={<Music2 className="h-4 w-4" />}>
      <div className="grid h-full grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><div className="text-2xl font-semibold text-white">{track.title}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{track.mood} · {formatDuration(track.durationSeconds)} · {versions.length || 0} versions</div></div>
          {activeVersion?.approvedAt ? <StatusPill status="Approved" /> : <StatusPill status={activeVersion ? `Version ${activeVersion.version ?? 1}` : "Not generated"} />}
        </div>
        <div className="rounded-xl bg-black/20 p-4 ring-1 ring-inset ring-[var(--border)]">
          <Waveform isPlaying={Boolean(isCurrent && isPlaying)} progress={isCurrent && activeTrack ? usePlayerStore.getState().positionSeconds / activeTrack.durationSeconds : 0.28} />
          <div className="mt-3 flex items-center justify-between">
            <button disabled={!activeVersion} onClick={() => { if (!isCurrent) loadTrack({ title: track.title, projectTitle, artworkTitle: projectTitle, durationSeconds: activeVersion?.durationSeconds ?? track.durationSeconds, sourceUrl, version: activeVersion?.version }); togglePlaying(); }} className="flex h-10 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--violet),var(--rose))] px-4 text-sm font-medium disabled:opacity-40">{isCurrent && isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}Audition</button>
            <div className="flex gap-1.5">{versions.map((version) => <button key={version.id ?? version.version} onClick={() => setActiveVersion(version)} className={`h-9 min-w-9 rounded-lg px-3 text-xs ${activeVersion === version ? "bg-[rgba(239,99,152,.16)] text-white ring-1 ring-inset ring-[var(--border-active)]" : "bg-white/[.04] text-[var(--text-muted)]"}`}>V{version.version ?? 1}</button>)}</div>
          </div>
        </div>
        <div className="min-h-0 rounded-xl bg-white/[0.025] p-4 ring-1 ring-inset ring-[var(--border)]">
          <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.13em] text-[var(--rose-soft)]">Generation prompt</span><button onClick={refine} disabled={Boolean(busy)} className="flex h-8 items-center gap-2 rounded-lg bg-white/[.05] px-3 text-xs hover:bg-white/[.08] disabled:opacity-40"><Sparkles className="h-3.5 w-3.5" />Refine</button></div>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="mt-3 h-28 w-full resize-none bg-transparent text-sm leading-6 text-[var(--text-secondary)] outline-none" />
          <AnimatePresence>{explanation ? <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--text-muted)]">{explanation}</motion.p> : null}</AnimatePresence>
        </div>
        <div className="grid grid-cols-5 gap-2">
          <a href={sourceUrl} download title="Download selected track" className={`flex h-10 items-center justify-center rounded-lg bg-white/[.05] text-xs hover:bg-white/[.08] ${activeVersion ? "" : "pointer-events-none opacity-40"}`}><Download className="h-3.5 w-3.5" /></a>
          <button onClick={() => onApplyPrompt(prompt)} className="h-10 rounded-lg bg-white/[.05] text-xs hover:bg-white/[.08]">Use prompt</button>
          <button onClick={regenerate} disabled={Boolean(busy)} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-white/[.05] text-xs hover:bg-white/[.08] disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5" />Regenerate</button>
          <button onClick={() => versionAction("select")} disabled={!activeVersion || Boolean(busy)} className="h-10 rounded-lg bg-white/[.05] text-xs disabled:opacity-40">Use version</button>
          <button onClick={() => versionAction("approve")} disabled={!activeVersion || Boolean(busy)} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[rgba(88,182,168,.12)] text-xs text-[var(--success)] disabled:opacity-40"><Check className="h-3.5 w-3.5" />Approve</button>
        </div>
      </div>
    </Drawer>
  );
}

export function CreativeVariantsDrawer({ open, onClose, projectId, variants, onUseTitle, onUseThumbnail, onRefresh }: { open: boolean; onClose: () => void; projectId: string; variants?: { titles: string[]; thumbnailPrompts: string[]; createdAt: string }; onUseTitle: (title: string) => Promise<void>; onUseThumbnail: (prompt: string) => Promise<void>; onRefresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function generate() { setBusy(true); const response = await fetch(`/api/projects/${projectId}/creative-variants`, { method: "POST", headers: { "Content-Type": "application/json" } }); const data = await response.json(); setBusy(false); emitToast(response.ok ? "Creative variants are ready." : data.error ?? "Variants could not be created.", response.ok ? "success" : "error"); if (response.ok) await onRefresh(); }
  return (
    <Drawer open={open} onClose={onClose} title="Creative variants" icon={<ImageIcon className="h-4 w-4" />}>
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-4 pt-4">
        <div className="flex items-center justify-between rounded-xl bg-black/20 p-4 ring-1 ring-inset ring-[var(--border)]"><div><div className="text-sm font-medium text-white">YouTube release options</div><div className="mt-1 text-xs text-[var(--text-muted)]">Three title and thumbnail directions, generated on demand.</div></div><button onClick={generate} disabled={busy} className="flex h-9 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--violet),var(--rose))] px-4 text-xs font-medium disabled:opacity-40">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{variants ? "Refresh" : "Generate"}</button></div>
        <div className="grid min-h-0 grid-cols-2 gap-3 overflow-hidden">
          <section><div className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--rose-soft)]">Title variants</div><div className="grid gap-2">{(variants?.titles ?? ["Generate variants to compare release titles."]).map((title, index) => <button key={title} disabled={!variants} onClick={() => onUseTitle(title)} className="rounded-lg bg-white/[.025] p-3 text-left text-xs leading-5 text-[var(--text-secondary)] ring-1 ring-inset ring-[var(--border)] hover:bg-white/[.05] hover:text-white disabled:opacity-50"><span className="mr-2 text-[var(--rose-soft)]">0{index + 1}</span>{title}</button>)}</div></section>
          <section><div className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--rose-soft)]">Thumbnail directions</div><div className="grid gap-2">{(variants?.thumbnailPrompts ?? ["Generate variants to compare artwork directions."]).map((prompt, index) => <button key={prompt} disabled={!variants} onClick={() => onUseThumbnail(prompt)} className="rounded-lg bg-white/[.025] p-3 text-left text-xs leading-5 text-[var(--text-secondary)] ring-1 ring-inset ring-[var(--border)] hover:bg-white/[.05] hover:text-white disabled:opacity-50"><span className="mr-2 text-[var(--rose-soft)]">0{index + 1}</span>{prompt}</button>)}</div></section>
        </div>
      </div>
    </Drawer>
  );
}

export function SequenceDrawer({ open, onClose, projectId, projectTitle, tracks, production, artworkAssets, onSave, onAssetUploaded, standalone = false }: { open: boolean; onClose: () => void; projectId: string; projectTitle: string; tracks: StudioTrack[]; production?: StudioProduction; artworkAssets: StudioArtwork[]; onSave: (tracks: StudioTrack[], production: StudioProduction) => Promise<void>; onAssetUploaded: () => Promise<void>; standalone?: boolean }) {
  const [ordered, setOrdered] = useState(tracks);
  const [settings, setSettings] = useState<StudioProduction>({ ...DEFAULT_STUDIO_PRODUCTION, ...production });
  const [previewing, setPreviewing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const wasOpen = useRef(false);
  useEffect(() => {
    const active = standalone || open;
    if (active && !wasOpen.current) {
      setOrdered(tracks);
      setSettings({ ...DEFAULT_STUDIO_PRODUCTION, ...production });
    }
    wasOpen.current = active;
  }, [open, production, standalone, tracks]);
  const total = ordered.reduce((sum, track) => sum + track.durationSeconds, 0) + Math.max(0, ordered.length - 1) * settings.gapSeconds;
  const art = artworkAssets.find((asset) => asset.id === settings.artworkAssetId) ?? artworkAssets[0];
  const overlayStrength = (settings.overlayOpacity ?? 55) / 100;
  const previewStyle = {
    filter: previewFilter(settings.visualPreset ?? "velvet", (settings.filterIntensity ?? 70) / 100),
    "--grain-opacity": String(((settings.grain ?? 0) / 100) * overlayStrength),
    "--flicker-opacity": String(((settings.flicker ?? 0) / 100) * overlayStrength),
    "--vignette-opacity": String(((settings.vignette ?? 0) / 100) * overlayStrength),
    "--dust-opacity": String(((settings.dust ?? 0) / 100) * overlayStrength)
  } as React.CSSProperties & Record<string, string>;

  async function uploadArtwork(file?: File) {
    if (!file) return;
    setUploading(true);
    const form = new FormData(); form.set("projectId", projectId); form.set("file", file);
    const response = await fetch("/api/assets", { method: "POST", body: form });
    const data = await response.json();
    setUploading(false);
    if (!response.ok) return emitToast(data.error ?? "Artwork upload failed.", "error");
    emitToast("Artwork added to the timeline.", "success");
    await onAssetUploaded();
    setSettings((current) => ({ ...current, artworkAssetId: data.asset.id }));
  }

  const editor = (
      <div className="grid h-full grid-rows-[minmax(0,1fr)_164px_48px] gap-3 pt-3">
        <div className="grid min-h-0 grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)] gap-3">
          <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_42px] overflow-hidden rounded-xl bg-black/30 ring-1 ring-inset ring-[var(--border)]">
            <div className="video-preview relative isolate min-h-0 overflow-hidden bg-[#090a10]" style={previewStyle}>
              {art ? <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(/api/assets?projectId=${encodeURIComponent(projectId)}&assetId=${encodeURIComponent(art.id)})` }} /> : <div className="absolute inset-0 grid place-items-center"><div className="text-center"><ImageIcon className="mx-auto h-7 w-7 text-[var(--text-muted)]" /><div className="mt-3 font-serif text-3xl text-white">{projectTitle}</div><div className="mt-1 text-[10px] uppercase tracking-[.16em] text-[var(--text-muted)]">Add artwork to begin</div></div></div>}
              <div className="video-grain absolute inset-0" /><div className="video-flicker absolute inset-0" /><div className="video-vignette absolute inset-0" /><div className="video-dust absolute inset-0" />
              <motion.div className="absolute bottom-0 top-0 z-20 w-px bg-white/80 shadow-[0_0_8px_rgba(255,255,255,.7)]" initial={false} animate={{ left: previewing ? ["0%", "100%"] : "0%" }} transition={previewing ? { duration: 8, ease: "linear", repeat: Infinity } : { duration: 0.2 }} />
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border)] px-3">
              <button onClick={() => setPreviewing((current) => !current)} className="flex h-8 items-center gap-2 rounded-lg bg-white/[.06] px-3 text-xs text-white">{previewing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}{previewing ? "Pause preview" : "Preview motion"}</button>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.12em] text-[var(--text-muted)]"><Eye className="h-3.5 w-3.5" />16:9 · 1080p · {formatDuration(total)}</div>
            </div>
          </section>

          <section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 rounded-xl bg-[#1a1725] p-3 ring-1 ring-inset ring-[var(--border)]">
            <div>
              <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.13em] text-[var(--rose-soft)]">Artwork</span><label title="Upload artwork" className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md bg-white/[.05] px-2 text-[10px] hover:bg-white/[.08]">{uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}Add<input type="file" accept="image/*" className="hidden" onChange={(event) => uploadArtwork(event.target.files?.[0])} /></label></div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">{artworkAssets.slice(0, 3).map((asset) => <button key={asset.id} title={asset.name} onClick={() => setSettings({ ...settings, artworkAssetId: asset.id })} className={`h-9 truncate rounded-lg px-2 text-[10px] ${art?.id === asset.id ? "bg-[rgba(239,99,152,.15)] text-white ring-1 ring-inset ring-[var(--border-active)]" : "bg-black/20 text-[var(--text-muted)]"}`}>{asset.name}</button>)}{!artworkAssets.length ? <div className="col-span-3 grid h-9 place-items-center rounded-lg bg-black/20 text-[10px] text-[var(--text-muted)]">No artwork uploaded</div> : null}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[.13em] text-[var(--rose-soft)]">Velvet looks</div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">{(["clean", "velvet", "rose-film", "midnight", "noir", "mono"] as const).map((preset) => <button key={preset} onClick={() => setSettings({ ...settings, visualPreset: preset })} className={`h-8 rounded-lg text-[10px] capitalize ${settings.visualPreset === preset ? "bg-white/[.1] text-white ring-1 ring-inset ring-[var(--border-active)]" : "bg-black/20 text-[var(--text-muted)] hover:text-white"}`}>{preset.replace("-", " ")}</button>)}</div>
            </div>
            <div className="grid min-h-0 content-start gap-2">
              <EffectSlider label="Look" value={settings.filterIntensity ?? 70} onChange={(filterIntensity) => setSettings({ ...settings, filterIntensity })} />
              <EffectSlider label="Transparency" value={settings.overlayOpacity ?? 55} onChange={(overlayOpacity) => setSettings({ ...settings, overlayOpacity })} />
              <div className="grid grid-cols-2 gap-x-3 gap-y-2"><EffectSlider label="Grain" value={settings.grain ?? 18} onChange={(grain) => setSettings({ ...settings, grain })} /><EffectSlider label="Flicker" value={settings.flicker ?? 8} onChange={(flicker) => setSettings({ ...settings, flicker })} /><EffectSlider label="Vignette" value={settings.vignette ?? 28} onChange={(vignette) => setSettings({ ...settings, vignette })} /><EffectSlider label="Dust" value={settings.dust ?? 5} onChange={(dust) => setSettings({ ...settings, dust })} /></div>
            </div>
          </section>
        </div>

        <section className="relative grid grid-rows-3 gap-2 rounded-xl bg-[#11101a] p-3 ring-1 ring-inset ring-[var(--border)]">
          <TimelineLane label="VISUAL" icon={<ImageIcon className="h-3 w-3" />}><div className="h-full rounded-md border border-[rgba(190,137,232,.26)] bg-[rgba(190,137,232,.11)] px-3 text-[10px] leading-8 text-white">{art?.name ?? "Artwork placeholder"}</div></TimelineLane>
          <TimelineLane label="MUSIC" icon={<Music2 className="h-3 w-3" />}><Reorder.Group axis="x" values={ordered} onReorder={setOrdered} className="flex h-full min-w-0 gap-1">{ordered.map((track, index) => <Reorder.Item value={track} key={track.title} title={`${track.title} · drag to reorder`} className="group relative min-w-[52px] cursor-grab overflow-hidden rounded-md border border-[rgba(88,182,168,.28)] bg-[rgba(88,182,168,.1)] px-2 active:cursor-grabbing" style={{ flexGrow: track.durationSeconds, flexBasis: 0 }}><div className="truncate text-[9px] leading-8 text-white">{String(index + 1).padStart(2, "0")} {track.title}</div><div className="absolute inset-x-1 bottom-1 flex h-1 items-end gap-px">{[3,7,4,9,5,8,3,6,4,8,5,7].map((height, bar) => <i key={bar} className="flex-1 bg-[rgba(136,222,206,.55)]" style={{ height }} />)}</div></Reorder.Item>)}</Reorder.Group></TimelineLane>
          <TimelineLane label="FX" icon={<Layers3 className="h-3 w-3" />}><div className="flex h-full gap-1">{[["Grain", settings.grain], ["Flicker", settings.flicker], ["Vignette", settings.vignette], ["Dust", settings.dust]].filter(([, value]) => Number(value) > 0).map(([label, value]) => <div key={String(label)} className="h-full min-w-20 flex-1 rounded-md border border-[rgba(239,99,152,.24)] bg-[rgba(239,99,152,.09)] px-2 text-[9px] leading-8 text-[var(--rose-soft)]">{label} {value}%</div>)}</div></TimelineLane>
        </section>

        <div className="grid grid-cols-[auto_auto_auto_minmax(180px,1fr)_auto] items-end gap-3"><CompactNumber label="Gap" value={settings.gapSeconds} min={0} max={10} step={0.5} suffix="s" onChange={(gapSeconds) => setSettings({ ...settings, gapSeconds })} /><CompactNumber label="Fade" value={settings.fadeSeconds} min={0} max={5} step={0.1} suffix="s" onChange={(fadeSeconds) => setSettings({ ...settings, fadeSeconds })} /><CompactNumber label="Loudness" value={settings.targetLufs} min={-24} max={-8} step={1} suffix=" LUFS" onChange={(targetLufs) => setSettings({ ...settings, targetLufs })} /><label className="text-[9px] uppercase tracking-[.12em] text-[var(--text-muted)]">Schedule publish<input type="datetime-local" value={settings.scheduledPublishAt?.slice(0, 16) ?? ""} onChange={(event) => setSettings({ ...settings, scheduledPublishAt: event.target.value ? new Date(event.target.value).toISOString() : undefined })} className="mt-1 h-8 w-full rounded-lg bg-black/20 px-3 text-xs normal-case text-white ring-1 ring-inset ring-[var(--border)]" /></label><button onClick={() => onSave(ordered, { ...settings, artworkAssetId: art?.id })} className="h-10 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-5 text-sm font-medium">Save timeline</button></div>
      </div>
  );

  if (standalone) {
    return <div className="h-full min-h-0 w-full p-3 lg:p-4"><section aria-label="Video timeline" className="panel grid h-full min-h-0 grid-rows-[44px_minmax(0,1fr)] overflow-hidden rounded-xl bg-[#14121f] p-3"><header className="flex items-center justify-between border-b border-[var(--border)] pb-2"><div className="flex min-w-0 items-center gap-3"><button onClick={onClose} aria-label="Back to project" title="Back to project" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[.045] text-[var(--text-muted)] hover:bg-white/[.08] hover:text-white"><ArrowLeft className="h-4 w-4" /></button><Activity className="h-4 w-4 shrink-0 text-[var(--rose-soft)]" /><div className="min-w-0"><div className="text-[11px] font-semibold uppercase tracking-[.13em] text-white">Video timeline</div><div className="truncate text-[10px] text-[var(--text-muted)]">{projectTitle}</div></div></div><span className="text-[10px] uppercase tracking-[.12em] text-[var(--text-muted)]">Artwork + music + effects</span></header>{editor}</section></div>;
  }

  return <Drawer open={open} onClose={onClose} title="Video timeline" icon={<Activity className="h-4 w-4" />} width="max-w-[980px]">{editor}</Drawer>;
}

function TimelineLane({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="grid min-h-0 grid-cols-[68px_minmax(0,1fr)] items-stretch gap-2"><div className="flex items-center gap-1.5 text-[9px] font-semibold tracking-[.13em] text-[var(--text-muted)]">{icon}{label}</div><div className="min-w-0">{children}</div></div>;
}

function EffectSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="grid grid-cols-[74px_minmax(0,1fr)_28px] items-center gap-2 text-[9px] uppercase tracking-[.1em] text-[var(--text-muted)]"><span>{label}</span><input aria-label={label} type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} className="velvet-range h-1 w-full" /><span className="tabular text-right text-[9px] text-[var(--text-secondary)]">{value}</span></label>;
}

function previewFilter(preset: NonNullable<StudioProduction["visualPreset"]>, intensity: number) {
  const amount = Math.max(0, Math.min(1, intensity));
  if (preset === "clean") return "none";
  if (preset === "mono") return `grayscale(${amount}) contrast(${1 + amount * 0.13})`;
  if (preset === "noir") return `grayscale(${amount * 0.72}) contrast(${1 + amount * 0.24}) brightness(${1 - amount * 0.04})`;
  if (preset === "rose-film") return `sepia(${amount * 0.18}) saturate(${1 - amount * 0.08}) contrast(${1 + amount * 0.09}) hue-rotate(${-amount * 8}deg)`;
  if (preset === "midnight") return `saturate(${1 - amount * 0.18}) contrast(${1 + amount * 0.18}) brightness(${1 - amount * 0.07}) hue-rotate(${amount * 12}deg)`;
  return `saturate(${1 + amount * 0.12}) contrast(${1 + amount * 0.12}) brightness(${1 - amount * 0.03}) hue-rotate(${amount * 4}deg)`;
}

function CompactNumber({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="text-[9px] uppercase tracking-[.12em] text-[var(--text-muted)]">{label}<div className="mt-1 flex items-center gap-1"><input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="h-8 min-w-0 w-full rounded-lg bg-white/[.04] px-2 text-xs normal-case text-white" /><span className="text-[9px] normal-case">{suffix}</span></div></label>;
}

export function GenerationDrawer({ open, onClose, jobs, services, estimatedCost, onRefresh }: { open: boolean; onClose: () => void; jobs: StudioJob[]; services: Array<{ label: string; ready: boolean }>; estimatedCost: number | null; onRefresh: () => Promise<void> }) {
  async function act(jobId: string, action: "retry" | "cancel") { const response = await fetch("/api/jobs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, action }) }); emitToast(response.ok ? `Job ${action === "retry" ? "queued again" : "cancelled"}.` : "Job could not be updated.", response.ok ? "success" : "error"); await onRefresh(); }
  return (
    <Drawer open={open} onClose={onClose} title="Generation center" icon={<Activity className="h-4 w-4" />}>
      <div className="grid h-full grid-rows-[auto_auto_minmax(0,1fr)] gap-4 pt-4">
        <div className="grid grid-cols-3 gap-2">{services.map((service) => <div key={service.label} className="rounded-lg bg-white/[.025] p-3 ring-1 ring-inset ring-[var(--border)]"><div className="text-[10px] uppercase tracking-[.1em] text-[var(--text-muted)]">{service.label}</div><div className={`mt-2 text-xs ${service.ready ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>{service.ready ? "Ready" : "Needs setup"}</div></div>)}</div>
        <div className="flex items-center justify-between rounded-lg bg-black/20 px-4 py-3 ring-1 ring-inset ring-[var(--border)]"><div><div className="text-[10px] uppercase tracking-[.12em] text-[var(--text-muted)]">Next generation estimate</div><div className="mt-1 text-sm text-white">{estimatedCost === null ? "Set rates in Settings" : `$${estimatedCost.toFixed(2)} estimated`}</div></div><Clock3 className="h-4 w-4 text-[var(--rose-soft)]" /></div>
        <div className="grid min-h-0 content-start gap-2 overflow-hidden">
          {(jobs.length ? jobs : [{ id: "empty", type: "queue", status: "idle", message: "No generation jobs yet." }]).slice(0, 7).map((job) => <div key={job.id} className="rounded-lg bg-white/[.025] p-3 ring-1 ring-inset ring-[var(--border)]"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-medium capitalize text-white">{job.status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--cyan)]" /> : <FileAudio className="h-3.5 w-3.5 text-[var(--rose-soft)]" />}{job.type}</div><StatusPill status={job.status} /></div><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{job.message}</p>{job.id !== "empty" && (["failed", "blocked", "queued"].includes(job.status)) ? <div className="mt-2 flex gap-2">{["failed", "blocked"].includes(job.status) ? <button onClick={() => act(job.id, "retry")} className="flex h-8 items-center gap-1.5 rounded-lg bg-white/[.05] px-3 text-xs"><RotateCcw className="h-3 w-3" />Retry</button> : null}{job.status === "queued" ? <button onClick={() => act(job.id, "cancel")} className="h-8 rounded-lg bg-white/[.05] px-3 text-xs text-[var(--danger)]">Cancel</button> : null}</div> : null}</div>)}
        </div>
      </div>
    </Drawer>
  );
}

export function ReferenceUploader({ projectId, onUploaded }: { projectId: string; onUploaded: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function upload(file?: File) { if (!file) return; setBusy(true); const form = new FormData(); form.set("projectId", projectId); form.set("file", file); const response = await fetch("/api/assets", { method: "POST", body: form }); const data = await response.json(); setBusy(false); emitToast(response.ok ? `${file.name} added as a reference.` : data.error ?? "Reference upload failed.", response.ok ? "success" : "error"); if (response.ok) await onUploaded(); }
  return <label title="Import reference audio or artwork" className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white/[.04] px-3 text-xs text-[var(--text-secondary)] hover:bg-white/[.07] hover:text-white">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Reference<input type="file" accept="audio/*,image/*" className="hidden" onChange={(event) => upload(event.target.files?.[0])} /></label>;
}
