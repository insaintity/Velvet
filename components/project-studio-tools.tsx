"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ArrowLeft, Check, Clipboard, Clock3, Copy, Crop, Download, Eye, FileAudio, FileVideo, ImageIcon, Layers3, Loader2, Music2, Pause, Play, Redo2, RefreshCw, RotateCcw, Scissors, Sparkles, Trash2, Undo2, Upload, VolumeX, X } from "lucide-react";
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
  exportSize?: "1080p" | "720p" | "shorts" | "square";
  exportFormat?: "mp4" | "webm";
  exportQuality?: "draft" | "standard" | "high";
};
export type StudioArtwork = { id: string; name: string; kind: "audio" | "artwork"; filePath: string; storagePath?: string; previewUrl?: string; createdAt: string };
type LocalMediaAsset = { id: string; name: string; kind: "audio" | "image" | "video"; previewUrl?: string; durationSeconds?: number; createdAt: string };
type VideoSegment = { id: string; label: string; duration: number };
type EffectSegment = { id: string; label: string; setting: "grain" | "flicker" | "vignette" | "dust"; duration: number };
type EditorSnapshot = { ordered: StudioTrack[]; videoSegments: VideoSegment[]; effectSegments: EffectSegment[] };
const DEFAULT_STUDIO_PRODUCTION: StudioProduction = { gapSeconds: 1.5, fadeSeconds: 0.8, targetLufs: -14, stylePreset: "Studio master", visualPreset: "velvet", filterIntensity: 70, overlayOpacity: 55, grain: 18, flicker: 8, vignette: 28, dust: 5, exportSize: "1080p", exportFormat: "mp4", exportQuality: "standard" };
const acceptedEditorMediaTypes = ".mp3,.mp4,.png,.jpg,.jpeg,.gif,audio/mpeg,audio/mp3,video/mp4,image/png,image/jpeg,image/gif";

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

export function CreativeVariantsDrawer({ open, onClose, projectId, projectTitle, variants, onUseTitle, onUseThumbnail, onRefresh, standalone = false }: { open: boolean; onClose: () => void; projectId: string; projectTitle?: string; variants?: { titles: string[]; thumbnailPrompts: string[]; createdAt: string }; onUseTitle: (title: string) => Promise<void>; onUseThumbnail: (prompt: string) => Promise<void>; onRefresh: () => Promise<void>; standalone?: boolean }) {
  const [busy, setBusy] = useState(false);
  async function generate() { setBusy(true); const response = await fetch(`/api/projects/${projectId}/creative-variants`, { method: "POST", headers: { "Content-Type": "application/json" } }); const data = await response.json(); setBusy(false); emitToast(response.ok ? "Creative variants are ready." : data.error ?? "Variants could not be created.", response.ok ? "success" : "error"); if (response.ok) await onRefresh(); }
  const editor = (
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 pt-4">
        <div className="flex items-center justify-between rounded-xl bg-black/20 p-4 ring-1 ring-inset ring-[var(--border)]"><div><div className="text-sm font-medium text-white">Release artwork options</div><div className="mt-1 text-xs text-[var(--text-muted)]">Three title and thumbnail directions, generated on demand.</div></div><button onClick={generate} disabled={busy} className="flex h-9 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--violet),var(--rose))] px-4 text-xs font-medium disabled:opacity-40">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{variants ? "Refresh" : "Generate"}</button></div>
        <div className="grid min-h-0 grid-cols-2 gap-3 overflow-hidden">
          <section><div className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--rose-soft)]">Title variants</div><div className="grid gap-2">{(variants?.titles ?? ["Generate variants to compare release titles."]).map((title, index) => <button key={title} disabled={!variants} onClick={() => onUseTitle(title)} className="rounded-lg bg-white/[.025] p-3 text-left text-xs leading-5 text-[var(--text-secondary)] ring-1 ring-inset ring-[var(--border)] hover:bg-white/[.05] hover:text-white disabled:opacity-50"><span className="mr-2 text-[var(--rose-soft)]">0{index + 1}</span>{title}</button>)}</div></section>
          <section><div className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--rose-soft)]">Thumbnail directions</div><div className="grid gap-2">{(variants?.thumbnailPrompts ?? ["Generate variants to compare artwork directions."]).map((prompt, index) => <button key={prompt} disabled={!variants} onClick={() => onUseThumbnail(prompt)} className="rounded-lg bg-white/[.025] p-3 text-left text-xs leading-5 text-[var(--text-secondary)] ring-1 ring-inset ring-[var(--border)] hover:bg-white/[.05] hover:text-white disabled:opacity-50"><span className="mr-2 text-[var(--rose-soft)]">0{index + 1}</span>{prompt}</button>)}</div></section>
      </div>
    </div>
  );

  if (standalone) {
    return <div className="h-full min-h-0 w-full p-3 lg:p-4"><section aria-label="Thumbnail editor" className="panel grid h-full min-h-0 grid-rows-[44px_minmax(0,1fr)] overflow-hidden rounded-xl bg-[#14121f] p-3"><header className="flex items-center justify-between border-b border-[var(--border)] pb-2"><div className="flex min-w-0 items-center gap-3"><button onClick={onClose} aria-label="Back to project" title="Back to project" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[.045] text-[var(--text-muted)] hover:bg-white/[.08] hover:text-white"><ArrowLeft className="h-4 w-4" /></button><ImageIcon className="h-4 w-4 shrink-0 text-[var(--rose-soft)]" /><div className="min-w-0"><div className="text-[11px] font-semibold uppercase tracking-[.13em] text-white">Thumbnail editor</div><div className="truncate text-[10px] text-[var(--text-muted)]">{projectTitle}</div></div></div><span className="text-[10px] uppercase tracking-[.12em] text-[var(--text-muted)]">Titles + artwork directions</span></header>{editor}</section></div>;
  }

  return (
    <Drawer open={open} onClose={onClose} title="Creative variants" icon={<ImageIcon className="h-4 w-4" />}>
      {editor}
    </Drawer>
  );
}

export function SequenceDrawer({ open, onClose, projectId, projectTitle, tracks, production, artworkAssets, onSave, onAssetUploaded, standalone = false }: { open: boolean; onClose: () => void; projectId?: string; projectTitle: string; tracks: StudioTrack[]; production?: StudioProduction; artworkAssets: StudioArtwork[]; onSave?: (tracks: StudioTrack[], production: StudioProduction) => Promise<void>; onAssetUploaded?: () => Promise<void>; standalone?: boolean }) {
  const [ordered, setOrdered] = useState(tracks);
  const [settings, setSettings] = useState<StudioProduction>({ ...DEFAULT_STUDIO_PRODUCTION, ...production });
  const [previewing, setPreviewing] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localArtworkAssets, setLocalArtworkAssets] = useState<StudioArtwork[]>([]);
  const [localMediaAssets, setLocalMediaAssets] = useState<LocalMediaAsset[]>([]);
  const [activeEditorTab, setActiveEditorTab] = useState<"media" | "edit" | "effects" | "export">("media");
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [copiedTrack, setCopiedTrack] = useState<StudioTrack | null>(null);
  const [cropMode, setCropMode] = useState<"fill" | "fit">("fill");
  const [selectedLane, setSelectedLane] = useState<"video" | "effect" | "audio">("audio");
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [effectSegments, setEffectSegments] = useState<EffectSegment[]>([]);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [selectedEffectIndex, setSelectedEffectIndex] = useState(0);
  const [cutFraction, setCutFraction] = useState(0.5);
  const [playheadFraction, setPlayheadFraction] = useState(0);
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([]);
  const [clipMenu, setClipMenu] = useState<{ x: number; y: number; lane: "video" | "effect" | "audio"; index: number } | null>(null);
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
  const effectiveArtworkAssets = projectId ? artworkAssets : localArtworkAssets;
  const art = effectiveArtworkAssets.find((asset) => asset.id === settings.artworkAssetId) ?? effectiveArtworkAssets[0];
  const overlayStrength = (settings.overlayOpacity ?? 55) / 100;
  const enabledEffects = new Set(effectSegments.map((effect) => effect.setting));
  const effectAmount = (setting: EffectSegment["setting"]) => enabledEffects.has(setting) ? Number(settings[setting] ?? 0) : 0;
  const previewStyle = {
    filter: previewFilter(settings.visualPreset ?? "velvet", (settings.filterIntensity ?? 70) / 100),
    "--grain-opacity": String((effectAmount("grain") / 100) * overlayStrength),
    "--flicker-opacity": String((effectAmount("flicker") / 100) * overlayStrength),
    "--vignette-opacity": String((effectAmount("vignette") / 100) * overlayStrength),
    "--dust-opacity": String((effectAmount("dust") / 100) * overlayStrength)
  } as React.CSSProperties & Record<string, string>;

  async function uploadArtwork(file?: File) {
    if (!file) return;
    if (!projectId) {
      await importFiles([file]);
      return;
    }
    setUploading(true);
    const form = new FormData(); form.set("projectId", projectId); form.set("file", file);
    const response = await fetch("/api/assets", { method: "POST", body: form });
    const data = await response.json();
    setUploading(false);
    if (!response.ok) return emitToast(data.error ?? "Artwork upload failed.", "error");
    emitToast("Artwork added to the timeline.", "success");
    await onAssetUploaded?.();
    setSettings((current) => ({ ...current, artworkAssetId: data.asset.id }));
    setVideoSegments((current) => [...current, { id: crypto.randomUUID(), label: data.asset.name ?? "Artwork", duration: 1 }]);
    setSelectedLane("video");
    setSelectedVideoIndex(videoSegments.length);
  }

  async function importFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    const supportedFiles = files.filter(isSupportedEditorMedia);
    const imageFiles = supportedFiles.filter((file) => isImageFile(file));
    const audioFiles = supportedFiles.filter((file) => isAudioFile(file));
    const videoFiles = supportedFiles.filter((file) => isVideoFile(file));
    if (projectId && imageFiles.length) {
      for (const image of imageFiles) await uploadArtwork(image);
    } else if (imageFiles.length) {
      const assets = imageFiles.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name.slice(0, 180),
        kind: "artwork" as const,
        filePath: "",
        previewUrl: URL.createObjectURL(file),
        createdAt: new Date().toISOString()
      }));
      setLocalArtworkAssets((current) => [...current, ...assets]);
      setSettings((current) => ({ ...current, artworkAssetId: assets.at(-1)?.id ?? current.artworkAssetId }));
      setVideoSegments((current) => [...current, ...assets.map((asset) => ({ id: crypto.randomUUID(), label: asset.name, duration: 1 }))]);
      setSelectedLane("video");
      setSelectedVideoIndex(videoSegments.length);
    }
    if (videoFiles.length) {
      const videoAssets = videoFiles.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name.slice(0, 180),
        kind: "video" as const,
        previewUrl: URL.createObjectURL(file),
        createdAt: new Date().toISOString()
      }));
      setLocalMediaAssets((current) => [...current, ...videoAssets]);
      setVideoSegments((current) => [...current, ...videoAssets.map((asset) => ({ id: crypto.randomUUID(), label: asset.name, duration: 1 }))]);
      setSelectedLane("video");
      setSelectedVideoIndex(videoSegments.length);
    }
    if (audioFiles.length) {
      const importedTracks = await Promise.all(audioFiles.map(async (file) => ({
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Imported audio",
        durationSeconds: await readAudioDuration(file),
        prompt: "Imported audio file",
        mood: "User supplied"
      })));
      setOrdered((current) => [...current, ...importedTracks]);
    }
    const rejected = files.length - supportedFiles.length;
    setUploading(false);
    if (imageFiles.length || audioFiles.length || videoFiles.length) emitToast("Media added to the video editor.", "success");
    if (rejected) emitToast("Use MP3, MP4, PNG, JPEG, or GIF files in the video editor.", "error");
  }

  async function saveTimeline() {
    const nextProduction = { ...settings, artworkAssetId: art?.id };
    if (onSave) return onSave(ordered, nextProduction);
    window.localStorage.setItem("velvet:video-editor-draft", JSON.stringify({ tracks: ordered, production: nextProduction, artwork: localArtworkAssets.map((asset) => ({ id: asset.id, name: asset.name, kind: asset.kind, filePath: asset.filePath, storagePath: asset.storagePath, createdAt: asset.createdAt })), updatedAt: new Date().toISOString() }));
    emitToast("Video editor draft saved on this device.", "success");
  }

  async function exportVideo() {
    const nextProduction = { ...settings, artworkAssetId: art?.id };
    if (!projectId) {
      await saveTimeline();
      emitToast("Export settings saved. Open a project with generated audio to render a video.", "neutral");
      return;
    }
    setRendering(true);
    try {
      if (onSave) await onSave(ordered, nextProduction);
      const response = await fetch("/api/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });
      const data = await response.json();
      if (!response.ok) {
        emitToast(data.error ?? "Video export failed.", "error");
        return;
      }
      emitToast(data.status === "completed" ? `Export ready: ${(nextProduction.exportFormat ?? "mp4").toUpperCase()} ${formatExportSize(nextProduction.exportSize)}` : data.message ?? "Export queued.", data.status === "completed" ? "success" : "neutral");
    } catch {
      emitToast("Video export failed.", "error");
    } finally {
      setRendering(false);
    }
  }

  const activeTrackIndex = Math.min(Math.max(0, selectedTrackIndex), Math.max(0, ordered.length - 1));
  const activeTrack = ordered[activeTrackIndex];
  const activeVideoIndex = Math.min(Math.max(0, selectedVideoIndex), Math.max(0, videoSegments.length - 1));
  const activeVideo = videoSegments[activeVideoIndex];
  const activeEffectIndex = Math.min(Math.max(0, selectedEffectIndex), Math.max(0, effectSegments.length - 1));
  const activeEffect = effectSegments[activeEffectIndex];
  const selectedDuration = selectedLane === "video" ? activeVideo?.duration : selectedLane === "effect" ? activeEffect?.duration : activeTrack?.durationSeconds;
  const mediaBinItems = [
    ...effectiveArtworkAssets.map((asset) => ({ id: asset.id, name: asset.name, kind: "image" as const })),
    ...localMediaAssets,
    ...ordered.map((track, index) => ({ id: `track-${index}-${track.title}`, name: track.title, kind: "audio" as const, durationSeconds: track.durationSeconds }))
  ];
  const rememberEdit = useCallback(() => {
    setUndoStack((current) => [...current.slice(-24), { ordered, videoSegments, effectSegments }]);
    setRedoStack([]);
  }, [effectSegments, ordered, videoSegments]);
  const undoEdit = useCallback(() => {
    const snapshot = undoStack.at(-1);
    if (!snapshot) return emitToast("Nothing to undo.", "error");
    setRedoStack((current) => [...current, { ordered, videoSegments, effectSegments }]);
    setOrdered(snapshot.ordered);
    setVideoSegments(snapshot.videoSegments);
    setEffectSegments(snapshot.effectSegments);
    setUndoStack((current) => current.slice(0, -1));
    emitToast("Undo applied.", "success");
  }, [effectSegments, ordered, undoStack, videoSegments]);
  const redoEdit = useCallback(() => {
    const snapshot = redoStack.at(-1);
    if (!snapshot) return emitToast("Nothing to redo.", "error");
    setUndoStack((current) => [...current, { ordered, videoSegments, effectSegments }]);
    setOrdered(snapshot.ordered);
    setVideoSegments(snapshot.videoSegments);
    setEffectSegments(snapshot.effectSegments);
    setRedoStack((current) => current.slice(0, -1));
    emitToast("Redo applied.", "success");
  }, [effectSegments, ordered, redoStack, videoSegments]);
  const cutActiveTrack = useCallback(() => {
    rememberEdit();
    if (selectedLane === "video") {
      if (!activeVideo) return emitToast("Add artwork or video before cutting.", "error");
      setVideoSegments((current) => {
        const segment = current[activeVideoIndex];
        if (!segment) return current;
        const fraction = clampCutFraction(cutFraction);
        const left = Math.max(0.1, segment.duration * fraction);
        const right = Math.max(0.1, segment.duration - left);
        const next = [...current];
        next.splice(activeVideoIndex, 1, { ...segment, id: crypto.randomUUID(), duration: left, label: segment.label }, { ...segment, id: crypto.randomUUID(), duration: right, label: `${segment.label} cut` });
        return next;
      });
      setSelectedVideoIndex(activeVideoIndex + 1);
      emitToast("Video/Image lane split. Shortcut: S", "success");
      return;
    }
    if (selectedLane === "effect") {
      setEffectSegments((current) => {
        const segment = current[activeEffectIndex];
        if (!segment) return current;
        const fraction = clampCutFraction(cutFraction);
        const left = Math.max(0.1, segment.duration * fraction);
        const right = Math.max(0.1, segment.duration - left);
        const next = [...current];
        next.splice(activeEffectIndex, 1, { ...segment, id: crypto.randomUUID(), duration: left }, { ...segment, id: crypto.randomUUID(), duration: right, label: `${segment.label} cut` });
        return next;
      });
      setSelectedEffectIndex(activeEffectIndex + 1);
      emitToast("Effect split. Shortcut: S", "success");
      return;
    }
    if (!activeTrack) return emitToast("Select audio or the video lane before cutting.", "error");
    const fraction = clampCutFraction(cutFraction);
    const left = Math.max(1, Math.round(activeTrack.durationSeconds * fraction));
    const right = Math.max(1, activeTrack.durationSeconds - left);
    setOrdered((current) => current.flatMap((track, index) => index === activeTrackIndex ? [{ ...track, durationSeconds: left, title: `${track.title} A` }, { ...track, durationSeconds: right, title: `${track.title} B` }] : [track]));
    setSelectedTrackIndex(activeTrackIndex + 1);
    emitToast("Audio clip split. Shortcut: S", "success");
  }, [activeEffectIndex, activeTrack, activeTrackIndex, activeVideo, activeVideoIndex, cutFraction, rememberEdit, selectedLane]);
  function copyActiveTrack() {
    if (!activeTrack) return emitToast("Add audio before copying.", "error");
    setCopiedTrack(activeTrack);
    emitToast("Audio clip copied.", "success");
  }
  function pasteCopiedTrack() {
    if (!copiedTrack) return emitToast("Copy an audio clip first.", "error");
    rememberEdit();
    setOrdered((current) => [...current, { ...copiedTrack, title: `${copiedTrack.title} copy` }]);
    setSelectedTrackIndex(ordered.length);
    emitToast("Audio clip pasted.", "success");
  }
  function reverseAudio() {
    if (ordered.length < 2) return emitToast("Add at least two audio clips to reverse.", "error");
    rememberEdit();
    setOrdered((current) => [...current].reverse());
    setSelectedTrackIndex(0);
    emitToast("Audio order reversed.", "success");
  }
  function removeAudio() {
    if (!ordered.length) return emitToast("No audio clips to remove.", "error");
    rememberEdit();
    setOrdered([]);
    setSelectedTrackIndex(0);
    emitToast("Audio lane cleared.", "success");
  }
  const deleteSelected = useCallback(() => {
    if (selectedLane === "video") {
      if (!videoSegments.length) return emitToast("No video/image segment selected.", "error");
      rememberEdit();
      setVideoSegments((current) => current.filter((_, index) => index !== activeVideoIndex));
      setSelectedVideoIndex(Math.max(0, activeVideoIndex - 1));
      emitToast("Video/Image segment deleted.", "success");
      return;
    }
    if (selectedLane === "effect") {
      if (!effectSegments.length) return emitToast("No effect selected.", "error");
      rememberEdit();
      const removed = effectSegments[activeEffectIndex];
      setEffectSegments((current) => current.filter((_, index) => index !== activeEffectIndex));
      setSelectedEffectIndex(Math.max(0, activeEffectIndex - 1));
      if (removed) setSettings((current) => ({ ...current, [removed.setting]: 0 }));
      emitToast("Effect removed.", "success");
      return;
    }
    if (!ordered.length) return emitToast("No audio clip selected.", "error");
    rememberEdit();
    setOrdered((current) => current.filter((_, index) => index !== activeTrackIndex));
    setSelectedTrackIndex(Math.max(0, activeTrackIndex - 1));
    emitToast("Audio clip deleted.", "success");
  }, [activeEffectIndex, activeTrackIndex, activeVideoIndex, effectSegments, ordered.length, rememberEdit, selectedLane, videoSegments.length]);
  function trimSelected(delta: number) {
    if (selectedLane === "video" && !activeVideo) return emitToast("Add artwork or video before trimming.", "error");
    if (selectedLane === "effect" && !activeEffect) return emitToast("Add an effect before trimming.", "error");
    if (selectedLane === "audio" && !activeTrack) return emitToast("Add audio before trimming.", "error");
    rememberEdit();
    if (selectedLane === "video") {
      setVideoSegments((current) => current.map((segment, index) => index === activeVideoIndex ? { ...segment, duration: Math.max(0.2, segment.duration + delta) } : segment));
      return;
    }
    if (selectedLane === "effect") {
      setEffectSegments((current) => current.map((segment, index) => index === activeEffectIndex ? { ...segment, duration: Math.max(0.2, segment.duration + delta) } : segment));
      return;
    }
    setOrdered((current) => current.map((track, index) => index === activeTrackIndex ? { ...track, durationSeconds: Math.max(1, track.durationSeconds + Math.round(delta * 12)) } : track));
  }
  function addEffect(setting: EffectSegment["setting"]) {
    rememberEdit();
    const label = { grain: "Grain", flicker: "Flicker", vignette: "Vignette", dust: "Dust" }[setting];
    setEffectSegments((current) => [...current, { id: crypto.randomUUID(), label, setting, duration: 1 }]);
    setSettings((current) => ({ ...current, [setting]: Math.max(Number(current[setting] ?? 0), setting === "grain" ? 18 : setting === "vignette" ? 28 : 8) }));
    setSelectedLane("effect");
    setSelectedEffectIndex(effectSegments.length);
    emitToast(`${label} effect added.`, "success");
  }
  function openClipMenu(event: React.MouseEvent<HTMLElement>, lane: "video" | "effect" | "audio", index: number) {
    event.preventDefault();
    setSelectedLane(lane);
    setCutFraction(pointerFraction(event));
    if (lane === "video") setSelectedVideoIndex(index);
    if (lane === "effect") setSelectedEffectIndex(index);
    if (lane === "audio") setSelectedTrackIndex(index);
    setClipMenu({ x: event.clientX, y: event.clientY, lane, index });
  }
  function runMenuAction(action: "cut" | "delete" | "duplicate") {
    setClipMenu(null);
    if (action === "cut") return cutActiveTrack();
    if (action === "delete") return deleteSelected();
    rememberEdit();
    if (selectedLane === "video" && activeVideo) {
      setVideoSegments((current) => [...current.slice(0, activeVideoIndex + 1), { ...activeVideo, id: crypto.randomUUID(), label: `${activeVideo.label} copy` }, ...current.slice(activeVideoIndex + 1)]);
      emitToast("Video/Image segment duplicated.", "success");
    } else if (selectedLane === "effect" && activeEffect) {
      setEffectSegments((current) => [...current.slice(0, activeEffectIndex + 1), { ...activeEffect, id: crypto.randomUUID(), label: `${activeEffect.label} copy` }, ...current.slice(activeEffectIndex + 1)]);
      emitToast("Effect duplicated.", "success");
    } else if (activeTrack) {
      setOrdered((current) => [...current.slice(0, activeTrackIndex + 1), { ...activeTrack, title: `${activeTrack.title} copy` }, ...current.slice(activeTrackIndex + 1)]);
      emitToast("Audio clip duplicated.", "success");
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isTyping || event.altKey) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        undoEdit();
      } else if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        redoEdit();
      } else if (!event.ctrlKey && !event.metaKey && key === "s") {
        event.preventDefault();
        cutActiveTrack();
      } else if (!event.ctrlKey && !event.metaKey && (key === "delete" || key === "backspace")) {
        event.preventDefault();
        deleteSelected();
      }
    };
    const active = standalone || open;
    if (!active) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cutActiveTrack, deleteSelected, open, redoEdit, standalone, undoEdit]);

  useEffect(() => {
    if (!clipMenu) return;
    const close = () => setClipMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [clipMenu]);

  const editor = (
      <div
        className={`grid h-full grid-rows-[minmax(320px,1fr)_36px_186px_48px] gap-3 pt-3 ${dragging ? "rounded-xl ring-2 ring-[var(--border-active)]" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); importFiles(Array.from(event.dataTransfer.files)).catch(() => emitToast("Media could not be imported.", "error")); }}
      >
        <div className="grid min-h-0 grid-cols-[minmax(0,2.25fr)_minmax(360px,.75fr)] gap-3">
          <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_42px] overflow-hidden rounded-xl bg-black/30 ring-1 ring-inset ring-[var(--border)]">
            <div className="video-preview relative isolate min-h-0 overflow-hidden bg-[#090a10]" style={previewStyle}>
              {art ? <div className="absolute inset-0 bg-center bg-no-repeat" style={{ backgroundImage: `url(${art.previewUrl ?? `/api/assets?projectId=${encodeURIComponent(projectId ?? "")}&assetId=${encodeURIComponent(art.id)}`})`, backgroundSize: cropMode === "fill" ? "cover" : "contain" }} /> : <div className="absolute inset-0 grid place-items-center"><div className="text-center"><ImageIcon className="mx-auto h-7 w-7 text-[var(--text-muted)]" /><div className="mt-3 font-serif text-4xl text-white">{projectTitle}</div><div className="mt-2 text-[10px] uppercase tracking-[.16em] text-[var(--text-muted)]">Drop artwork or audio here</div></div></div>}
              {enabledEffects.has("grain") ? <div className="video-grain absolute inset-0" /> : null}{enabledEffects.has("flicker") ? <div className="video-flicker absolute inset-0" /> : null}{enabledEffects.has("vignette") ? <div className="video-vignette absolute inset-0" /> : null}{enabledEffects.has("dust") ? <div className="video-dust absolute inset-0" /> : null}
              <motion.div className="absolute bottom-0 top-0 z-20 w-px bg-white/80 shadow-[0_0_8px_rgba(255,255,255,.7)]" initial={false} animate={{ left: previewing ? ["0%", "100%"] : "0%" }} transition={previewing ? { duration: 8, ease: "linear", repeat: Infinity } : { duration: 0.2 }} />
              {dragging ? <div className="absolute inset-0 z-30 grid place-items-center bg-black/55 backdrop-blur-sm"><div className="rounded-xl border border-[var(--border-active)] bg-[#211a2b]/95 px-5 py-4 text-center"><Upload className="mx-auto h-5 w-5 text-[var(--rose-soft)]" /><div className="mt-2 text-sm font-medium text-white">Drop media into timeline</div><div className="mt-1 text-xs text-[var(--text-muted)]">Images become visuals. Audio becomes music clips.</div></div></div> : null}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border)] px-3">
              <button onClick={() => setPreviewing((current) => !current)} className="flex h-8 items-center gap-2 rounded-lg bg-white/[.06] px-3 text-xs text-white">{previewing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}{previewing ? "Pause preview" : "Preview motion"}</button>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.12em] text-[var(--text-muted)]"><Eye className="h-3.5 w-3.5" />{formatExportSize(settings.exportSize)} - {(settings.exportFormat ?? "mp4").toUpperCase()} - {formatDuration(total)}</div>
            </div>
          </section>

          <section className="grid min-h-0 grid-rows-[36px_minmax(0,1fr)] gap-3 rounded-xl bg-[#1a1725] p-3 ring-1 ring-inset ring-[var(--border)]">
            <div role="tablist" aria-label="Video timeline tools" className="grid grid-cols-4 gap-1 rounded-lg bg-black/20 p-1">
              <button role="tab" aria-selected={activeEditorTab === "media"} onClick={() => setActiveEditorTab("media")} className={`rounded-md text-[10px] font-semibold uppercase tracking-[.12em] ${activeEditorTab === "media" ? "bg-white/[.1] text-white ring-1 ring-inset ring-[var(--border-active)]" : "text-[var(--text-muted)] hover:text-white"}`}>Add Media</button>
              <button role="tab" aria-selected={activeEditorTab === "edit"} onClick={() => setActiveEditorTab("edit")} className={`rounded-md text-[10px] font-semibold uppercase tracking-[.12em] ${activeEditorTab === "edit" ? "bg-white/[.1] text-white ring-1 ring-inset ring-[var(--border-active)]" : "text-[var(--text-muted)] hover:text-white"}`}>Edit</button>
              <button role="tab" aria-selected={activeEditorTab === "effects"} onClick={() => setActiveEditorTab("effects")} className={`rounded-md text-[10px] font-semibold uppercase tracking-[.12em] ${activeEditorTab === "effects" ? "bg-white/[.1] text-white ring-1 ring-inset ring-[var(--border-active)]" : "text-[var(--text-muted)] hover:text-white"}`}>Effects</button>
              <button role="tab" aria-selected={activeEditorTab === "export"} onClick={() => setActiveEditorTab("export")} className={`rounded-md text-[10px] font-semibold uppercase tracking-[.12em] ${activeEditorTab === "export" ? "bg-white/[.1] text-white ring-1 ring-inset ring-[var(--border-active)]" : "text-[var(--text-muted)] hover:text-white"}`}>Export</button>
            </div>
            {activeEditorTab === "media" ? <div className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3">
              <label title="Add media to this video edit" className="grid min-h-[74px] cursor-pointer place-items-center rounded-xl border border-dashed border-[var(--border-hover)] bg-black/20 p-3 text-center hover:border-[var(--border-active)] hover:bg-white/[.04]">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin text-[var(--rose-soft)]" /> : <Upload className="h-5 w-5 text-[var(--rose-soft)]" />}
                <span className="mt-2 block text-xs font-medium text-white">Select multiple media files</span>
                <span className="mt-1 block text-[10px] text-[var(--text-muted)]">MP3, MP4, PNG, JPEG, GIF</span>
                <input type="file" accept={acceptedEditorMediaTypes} multiple className="hidden" onChange={(event) => importFiles(Array.from(event.target.files ?? [])).catch(() => emitToast("Media could not be imported.", "error"))} />
              </label>
              <div className="grid grid-cols-5 gap-1">{["mp3", "mp4", "png", "jpeg", "gif"].map((type) => <span key={type} className="grid h-7 place-items-center rounded-md bg-white/[.04] text-[9px] font-semibold uppercase tracking-[.08em] text-[var(--text-secondary)]">{type}</span>)}</div>
              <div className="min-h-0 overflow-hidden rounded-lg bg-black/20 p-2 ring-1 ring-inset ring-[var(--border)]">
                <div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Project media bin</span><span className="text-[9px] tabular text-[var(--text-muted)]">{mediaBinItems.length}</span></div>
                <div className="mt-2 grid max-h-full gap-1 overflow-hidden">{mediaBinItems.length ? mediaBinItems.slice(0, 9).map((item) => <button key={item.id} type="button" title={item.name} onClick={() => { if (item.kind === "image") setSettings({ ...settings, artworkAssetId: item.id }); }} className="grid h-8 grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 rounded bg-white/[.035] px-2 text-left text-[10px] text-[var(--text-secondary)] hover:bg-white/[.06] hover:text-white">{item.kind === "audio" ? <FileAudio className="h-3.5 w-3.5 text-[var(--cyan)]" /> : item.kind === "video" ? <FileVideo className="h-3.5 w-3.5 text-[var(--violet)]" /> : <ImageIcon className="h-3.5 w-3.5 text-[var(--rose-soft)]" />}<span className="truncate">{item.name}</span><span className="uppercase text-[8px] text-[var(--text-muted)]">{item.kind}</span></button>) : <div className="grid h-20 place-items-center rounded bg-white/[.025] text-center text-[10px] leading-4 text-[var(--text-muted)]">Add or drag media to fill the bin.</div>}</div>
              </div>
            </div> : null}
            {activeEditorTab === "edit" ? <div className="grid min-h-0 content-start gap-3">
              <div className="rounded-lg bg-black/20 p-3 ring-1 ring-inset ring-[var(--border)]">
                <div className="text-[9px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Selected clip</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-[var(--text-secondary)]"><span>Lane</span><span className="text-right capitalize text-white">{selectedLane}</span><span>Clip</span><span className="truncate text-right text-white">{selectedLane === "effect" ? activeEffect?.label : selectedLane === "video" ? activeVideo?.label : activeTrack?.title ?? "None"}</span><span>Duration</span><span className="text-right text-white">{selectedDuration ? formatDuration(selectedLane === "video" || selectedLane === "effect" ? Math.round(selectedDuration * 30) : selectedDuration) : "0:00"}</span><span>Cut point</span><span className="text-right text-white">{Math.round(cutFraction * 100)}%</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={cutActiveTrack} className="h-9 rounded-lg bg-white/[.05] text-xs text-white hover:bg-white/[.08]">Cut at playhead</button>
                <button type="button" onClick={deleteSelected} className="h-9 rounded-lg bg-[rgba(219,99,114,.08)] text-xs text-[var(--danger)] hover:bg-[rgba(219,99,114,.13)]">Delete clip</button>
                <button type="button" onClick={copyActiveTrack} className="h-9 rounded-lg bg-white/[.05] text-xs text-[var(--text-secondary)] hover:bg-white/[.08] hover:text-white">Copy audio</button>
                <button type="button" onClick={pasteCopiedTrack} className="h-9 rounded-lg bg-white/[.05] text-xs text-[var(--text-secondary)] hover:bg-white/[.08] hover:text-white">Paste audio</button>
                <button type="button" onClick={reverseAudio} className="h-9 rounded-lg bg-white/[.05] text-xs text-[var(--text-secondary)] hover:bg-white/[.08] hover:text-white">Reverse audio order</button>
                <button type="button" onClick={removeAudio} className="h-9 rounded-lg bg-[rgba(219,99,114,.08)] text-xs text-[var(--danger)] hover:bg-[rgba(219,99,114,.13)]">Remove audio</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CompactNumber label="Gap" value={settings.gapSeconds} min={0} max={10} step={0.5} suffix="s" onChange={(gapSeconds) => setSettings({ ...settings, gapSeconds })} />
                <CompactNumber label="Fade" value={settings.fadeSeconds} min={0} max={5} step={0.1} suffix="s" onChange={(fadeSeconds) => setSettings({ ...settings, fadeSeconds })} />
                <CompactNumber label="Loudness" value={settings.targetLufs} min={-24} max={-8} step={1} suffix=" LUFS" onChange={(targetLufs) => setSettings({ ...settings, targetLufs })} />
                <button type="button" onClick={() => { setCropMode((mode) => mode === "fill" ? "fit" : "fill"); emitToast(cropMode === "fill" ? "Preview set to fit." : "Preview set to fill.", "success"); }} className="mt-4 h-8 rounded-lg bg-white/[.05] text-xs text-[var(--text-secondary)] hover:bg-white/[.08] hover:text-white">{cropMode === "fill" ? "Fit crop" : "Fill crop"}</button>
              </div>
            </div> : null}
            {activeEditorTab === "effects" ? <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[.13em] text-[var(--rose-soft)]">Velvet looks</div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">{(["clean", "velvet", "rose-film", "midnight", "noir", "mono"] as const).map((preset) => <button key={preset} onClick={() => setSettings({ ...settings, visualPreset: preset })} className={`h-8 rounded-lg text-[10px] capitalize ${settings.visualPreset === preset ? "bg-white/[.1] text-white ring-1 ring-inset ring-[var(--border-active)]" : "bg-black/20 text-[var(--text-muted)] hover:text-white"}`}>{preset.replace("-", " ")}</button>)}</div>
              </div>
              <div className="grid min-h-0 content-start gap-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {(["grain", "flicker", "vignette", "dust"] as const).map((effect) => <button key={effect} type="button" onClick={() => addEffect(effect)} className="h-7 rounded-md bg-white/[.045] text-[9px] capitalize text-[var(--text-secondary)] hover:bg-white/[.08] hover:text-white">+ {effect}</button>)}
                </div>
                <EffectSlider label="Look" value={settings.filterIntensity ?? 70} onChange={(filterIntensity) => setSettings({ ...settings, filterIntensity })} />
                <EffectSlider label="Transparency" value={settings.overlayOpacity ?? 55} onChange={(overlayOpacity) => setSettings({ ...settings, overlayOpacity })} />
                <div className="grid grid-cols-2 gap-x-3 gap-y-2"><EffectSlider label="Grain" value={settings.grain ?? 18} onChange={(grain) => setSettings({ ...settings, grain })} /><EffectSlider label="Flicker" value={settings.flicker ?? 8} onChange={(flicker) => setSettings({ ...settings, flicker })} /><EffectSlider label="Vignette" value={settings.vignette ?? 28} onChange={(vignette) => setSettings({ ...settings, vignette })} /><EffectSlider label="Dust" value={settings.dust ?? 5} onChange={(dust) => setSettings({ ...settings, dust })} /></div>
              </div>
            </div> : null}
            {activeEditorTab === "export" ? <div className="grid content-start gap-3">
              <div className="rounded-lg bg-black/20 p-3 ring-1 ring-inset ring-[var(--border)]">
                <div className="text-[10px] font-semibold uppercase tracking-[.13em] text-[var(--rose-soft)]">Export settings</div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Choose the video size, format, and quality before saving or rendering.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CompactSelect label="Size" value={settings.exportSize ?? "1080p"} options={[["1080p", "1080p"], ["720p", "720p"], ["shorts", "Shorts"], ["square", "Square"]]} onChange={(exportSize) => setSettings({ ...settings, exportSize: exportSize as StudioProduction["exportSize"] })} />
                <CompactSelect label="Format" value={settings.exportFormat ?? "mp4"} options={[["mp4", "MP4"], ["webm", "WebM"]]} onChange={(exportFormat) => setSettings({ ...settings, exportFormat: exportFormat as StudioProduction["exportFormat"] })} />
                <CompactSelect label="Quality" value={settings.exportQuality ?? "standard"} options={[["draft", "Draft"], ["standard", "Standard"], ["high", "High"]]} onChange={(exportQuality) => setSettings({ ...settings, exportQuality: exportQuality as StudioProduction["exportQuality"] })} />
              </div>
              <label className="text-[9px] uppercase tracking-[.12em] text-[var(--text-muted)]">Schedule publish<input type="datetime-local" value={settings.scheduledPublishAt?.slice(0, 16) ?? ""} onChange={(event) => setSettings({ ...settings, scheduledPublishAt: event.target.value ? new Date(event.target.value).toISOString() : undefined })} className="mt-1 h-8 w-full rounded-lg bg-black/20 px-2 text-xs normal-case text-white ring-1 ring-inset ring-[var(--border)]" /></label>
              <button onClick={saveTimeline} className="h-10 rounded-lg bg-white/[.055] px-4 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/[.08] hover:text-white">Save timeline</button>
              <button onClick={exportVideo} disabled={rendering} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-4 text-sm font-medium disabled:opacity-50">{rendering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Export video</button>
            </div> : null}
          </section>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-black/20 px-3 ring-1 ring-inset ring-[var(--border)]">
          <EditorTool icon={<Undo2 className="h-3.5 w-3.5" />} label="Undo" onClick={undoEdit} />
          <EditorTool icon={<Redo2 className="h-3.5 w-3.5" />} label="Redo" onClick={redoEdit} />
          <EditorTool icon={<Crop className="h-3.5 w-3.5" />} label={cropMode === "fill" ? "Fit crop" : "Fill crop"} onClick={() => { setCropMode((mode) => mode === "fill" ? "fit" : "fill"); emitToast(cropMode === "fill" ? "Preview set to fit." : "Preview set to fill.", "success"); }} />
          <EditorTool icon={<Scissors className="h-3.5 w-3.5" />} label="Cut (S)" onClick={cutActiveTrack} />
          <EditorTool icon={<Copy className="h-3.5 w-3.5" />} label="Copy" onClick={copyActiveTrack} />
          <EditorTool icon={<Clipboard className="h-3.5 w-3.5" />} label="Paste" onClick={pasteCopiedTrack} />
          <EditorTool icon={<RotateCcw className="h-3.5 w-3.5" />} label="Reverse" onClick={reverseAudio} />
          <EditorTool icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" onClick={deleteSelected} danger />
          <EditorTool icon={<VolumeX className="h-3.5 w-3.5" />} label="Remove audio" onClick={removeAudio} danger />
          <div className="ml-auto truncate text-[10px] uppercase tracking-[.12em] text-[var(--text-muted)]">{selectedLane === "video" ? `Selected: ${activeVideo?.label ?? "Video/Image lane"}` : activeTrack ? `Selected: ${activeTrack.title}` : "No audio selected"} - Cut at {Math.round(cutFraction * 100)}% - Press S</div>
        </div>

        <section className="relative grid grid-rows-[22px_repeat(3,minmax(0,1fr))] gap-2 rounded-xl bg-[#11101a] p-3 ring-1 ring-inset ring-[var(--border)]">
          <button type="button" onClick={(event) => setPlayheadFraction(pointerFraction(event))} className="relative ml-[112px] rounded bg-black/25 text-left ring-1 ring-inset ring-[var(--border)]"><span className="absolute inset-y-0 w-px bg-[var(--rose-soft)]" style={{ left: `${playheadFraction * 100}%` }} /><span className="grid h-full grid-cols-5 px-2 text-[9px] text-[var(--text-muted)]"><i>0:00</i><i>25%</i><i>50%</i><i>75%</i><i className="text-right">{formatDuration(total)}</i></span></button>
          <TimelineLane label="VIDEO/IMAGE" icon={<ImageIcon className="h-3 w-3" />}><Reorder.Group axis="x" values={videoSegments} onReorder={(next) => { rememberEdit(); setVideoSegments(next); }} className="flex h-full min-w-0 gap-1">{videoSegments.length ? videoSegments.map((segment, index) => <Reorder.Item value={segment} key={segment.id} onContextMenu={(event: React.MouseEvent<HTMLElement>) => openClipMenu(event, "video", index)} onClick={(event: React.MouseEvent<HTMLElement>) => { setSelectedLane("video"); setSelectedVideoIndex(index); setCutFraction(pointerFraction(event)); }} className={`relative h-full min-w-16 cursor-grab overflow-hidden rounded-md border px-2 text-left active:cursor-grabbing ${selectedLane === "video" && index === activeVideoIndex ? "border-[var(--border-active)] bg-[rgba(190,137,232,.18)]" : "border-[rgba(190,137,232,.26)] bg-[rgba(190,137,232,.11)]"}`} style={{ flexGrow: segment.duration, flexBasis: 0 }}><button type="button" aria-label="Trim video shorter" onClick={(event) => { event.stopPropagation(); trimSelected(-0.15); }} className="absolute bottom-1 left-1 top-1 w-1.5 rounded bg-white/35" /><button type="button" aria-label="Trim video longer" onClick={(event) => { event.stopPropagation(); trimSelected(0.15); }} className="absolute bottom-1 right-1 top-1 w-1.5 rounded bg-white/35" /><div className="truncate pl-2 pr-2 text-[10px] leading-8 text-white">{segment.label}</div>{selectedLane === "video" && index === activeVideoIndex ? <i className="absolute bottom-0 top-0 w-px bg-white/80" style={{ left: `${cutFraction * 100}%` }} /> : null}</Reorder.Item>) : <button type="button" onClick={(event: React.MouseEvent<HTMLElement>) => { setSelectedLane("video"); setCutFraction(pointerFraction(event)); }} className="grid h-full flex-1 place-items-center rounded-md border border-dashed border-[var(--border)] text-[10px] text-[var(--text-muted)]">Drop artwork or video here</button>}</Reorder.Group></TimelineLane>
          <TimelineLane label="EFFECT" icon={<Layers3 className="h-3 w-3" />}><Reorder.Group axis="x" values={effectSegments} onReorder={(next) => { rememberEdit(); setEffectSegments(next); }} className="flex h-full min-w-0 gap-1">{effectSegments.length ? effectSegments.map((effect, index) => <Reorder.Item value={effect} key={effect.id} onContextMenu={(event: React.MouseEvent<HTMLElement>) => openClipMenu(event, "effect", index)} onClick={(event: React.MouseEvent<HTMLElement>) => { setSelectedLane("effect"); setSelectedEffectIndex(index); setCutFraction(pointerFraction(event)); }} className={`relative h-full min-w-20 cursor-grab overflow-hidden rounded-md border pl-5 pr-2 active:cursor-grabbing ${selectedLane === "effect" && index === activeEffectIndex ? "border-[var(--border-active)] bg-[rgba(239,99,152,.16)]" : "border-[rgba(239,99,152,.24)] bg-[rgba(239,99,152,.09)]"}`} style={{ flexGrow: effect.duration, flexBasis: 0 }}><span aria-hidden="true" title="Drag effect" className="absolute bottom-1 left-1 top-1 grid w-3 place-items-center rounded bg-white/[.12] text-[8px] text-white/70">::</span><button type="button" aria-label="Trim effect shorter" onClick={(event) => { event.stopPropagation(); trimSelected(-0.15); }} className="absolute bottom-1 left-5 top-1 w-1.5 rounded bg-white/35" /><button type="button" aria-label="Trim effect longer" onClick={(event) => { event.stopPropagation(); trimSelected(0.15); }} className="absolute bottom-1 right-1 top-1 w-1.5 rounded bg-white/35" /><div className="truncate px-2 text-[9px] leading-8 text-[var(--rose-soft)]">{effect.label} {Number(settings[effect.setting] ?? 0)}%</div>{selectedLane === "effect" && index === activeEffectIndex ? <i className="absolute bottom-0 top-0 w-px bg-white/80" style={{ left: `${cutFraction * 100}%` }} /> : null}</Reorder.Item>) : <button type="button" onClick={() => addEffect("grain")} className="grid h-full flex-1 place-items-center rounded-md border border-dashed border-[var(--border)] text-[10px] text-[var(--text-muted)]">Add an effect</button>}</Reorder.Group></TimelineLane>
          <TimelineLane label="AUDIO" icon={<Music2 className="h-3 w-3" />}><Reorder.Group axis="x" values={ordered} onReorder={(next) => { rememberEdit(); setOrdered(next); }} className="flex h-full min-w-0 gap-1">{ordered.length ? ordered.map((track, index) => <Reorder.Item value={track} key={`${track.title}-${index}`} title={`${track.title} - drag to reorder`} onContextMenu={(event: React.MouseEvent<HTMLElement>) => openClipMenu(event, "audio", index)} onClick={(event: React.MouseEvent<HTMLElement>) => { setSelectedLane("audio"); setSelectedTrackIndex(index); setCutFraction(pointerFraction(event)); }} className={`group relative min-w-[52px] cursor-grab overflow-hidden rounded-md border px-2 active:cursor-grabbing ${selectedLane === "audio" && index === activeTrackIndex ? "border-[var(--border-active)] bg-[rgba(88,182,168,.16)]" : "border-[rgba(88,182,168,.28)] bg-[rgba(88,182,168,.1)]"}`} style={{ flexGrow: track.durationSeconds, flexBasis: 0 }}><button type="button" aria-label="Trim audio shorter" onClick={(event) => { event.stopPropagation(); trimSelected(-0.25); }} className="absolute bottom-1 left-1 top-1 w-1.5 rounded bg-white/35" /><button type="button" aria-label="Trim audio longer" onClick={(event) => { event.stopPropagation(); trimSelected(0.25); }} className="absolute bottom-1 right-1 top-1 w-1.5 rounded bg-white/35" /><div className="truncate px-2 text-[9px] leading-8 text-white">{String(index + 1).padStart(2, "0")} {track.title}</div><div className="absolute inset-x-1 bottom-1 flex h-1 items-end gap-px">{[3,7,4,9,5,8,3,6,4,8,5,7].map((height, bar) => <i key={bar} className="flex-1 bg-[rgba(136,222,206,.55)]" style={{ height }} />)}</div>{selectedLane === "audio" && index === activeTrackIndex ? <i className="absolute bottom-0 top-0 w-px bg-white/80" style={{ left: `${cutFraction * 100}%` }} /> : null}</Reorder.Item>) : <button type="button" onClick={(event: React.MouseEvent<HTMLElement>) => { setSelectedLane("audio"); setCutFraction(pointerFraction(event)); }} className="grid h-full flex-1 place-items-center rounded-md border border-dashed border-[var(--border)] text-[10px] text-[var(--text-muted)]">Drop audio here or push tracks from New Media</button>}</Reorder.Group></TimelineLane>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
          <div className="truncate rounded-lg bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[.12em] text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border)]">
            {formatExportSize(settings.exportSize)} - {(settings.exportFormat ?? "mp4").toUpperCase()} - {settings.exportQuality ?? "standard"} quality
          </div>
          <button onClick={saveTimeline} className="h-10 rounded-lg bg-white/[.055] px-4 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/[.08] hover:text-white">Save timeline</button>
          <button onClick={() => setActiveEditorTab("export")} className="flex h-10 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),var(--violet),var(--rose))] px-4 text-sm font-medium"><Download className="h-3.5 w-3.5" />Export</button>
        </div>
        {clipMenu ? <div role="menu" aria-label="Timeline clip menu" className="fixed z-[90] w-40 rounded-lg border border-[var(--border)] bg-[#1b1724] p-1 shadow-[0_18px_60px_rgba(0,0,0,.45)]" style={{ left: clipMenu.x, top: clipMenu.y }} onClick={(event) => event.stopPropagation()}>
          <button role="menuitem" onClick={() => runMenuAction("cut")} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-white hover:bg-white/[.07]"><Scissors className="h-3.5 w-3.5" />Cut here</button>
          <button role="menuitem" onClick={() => runMenuAction("duplicate")} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-[var(--text-secondary)] hover:bg-white/[.07] hover:text-white"><Copy className="h-3.5 w-3.5" />Duplicate</button>
          <button role="menuitem" onClick={() => runMenuAction("delete")} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-[var(--danger)] hover:bg-white/[.07]"><Trash2 className="h-3.5 w-3.5" />Delete</button>
        </div> : null}
      </div>
  );

  if (standalone) {
    return <div className="h-full min-h-0 w-full p-3 lg:p-4"><section aria-label="Video timeline" className="panel grid h-full min-h-0 grid-rows-[44px_minmax(0,1fr)] overflow-hidden rounded-xl bg-[#14121f] p-3"><header className="flex items-center justify-between border-b border-[var(--border)] pb-2"><div className="flex min-w-0 items-center gap-3"><button onClick={onClose} aria-label="Back to project" title="Back to project" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[.045] text-[var(--text-muted)] hover:bg-white/[.08] hover:text-white"><ArrowLeft className="h-4 w-4" /></button><Activity className="h-4 w-4 shrink-0 text-[var(--rose-soft)]" /><div className="min-w-0"><div className="text-[11px] font-semibold uppercase tracking-[.13em] text-white">Video timeline</div><div className="truncate text-[10px] text-[var(--text-muted)]">{projectTitle}</div></div></div><span className="text-[10px] uppercase tracking-[.12em] text-[var(--text-muted)]">Artwork + music + effects</span></header>{editor}</section></div>;
  }

  return <Drawer open={open} onClose={onClose} title="Video timeline" icon={<Activity className="h-4 w-4" />} width="max-w-[980px]">{editor}</Drawer>;
}

function EditorTool({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} title={label} className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-medium transition hover:bg-white/[.08] ${danger ? "text-[var(--danger)]" : "text-[var(--text-secondary)] hover:text-white"}`}>{icon}{label}</button>;
}

function pointerFraction(event: React.MouseEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width) return 0.5;
  return clampCutFraction((event.clientX - rect.left) / rect.width);
}

function clampCutFraction(value: number) {
  return Math.min(0.92, Math.max(0.08, value));
}

function TimelineLane({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="grid min-h-0 grid-cols-[104px_minmax(0,1fr)] items-stretch gap-2"><div className="flex items-center gap-1.5 text-[9px] font-semibold tracking-[.13em] text-[var(--text-muted)]">{icon}{label}</div><div className="min-w-0">{children}</div></div>;
}

function EffectSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="grid grid-cols-[74px_minmax(0,1fr)_28px] items-center gap-2 text-[9px] uppercase tracking-[.1em] text-[var(--text-muted)]"><span>{label}</span><input aria-label={label} type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} className="velvet-range h-1 w-full" /><span className="tabular text-right text-[9px] text-[var(--text-secondary)]">{value}</span></label>;
}

function CompactSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="text-[9px] uppercase tracking-[.12em] text-[var(--text-muted)]">{label}<select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-8 w-full rounded-lg bg-black/20 px-2 text-xs normal-case text-white ring-1 ring-inset ring-[var(--border)]">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
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

function formatExportSize(size?: StudioProduction["exportSize"]) {
  if (size === "720p") return "1280x720";
  if (size === "shorts") return "1080x1920";
  if (size === "square") return "1080x1080";
  return "1920x1080";
}

function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function isAudioFile(file: File) {
  return file.type === "audio/mpeg" || file.type === "audio/mp3" || fileExtension(file) === "mp3";
}

function isVideoFile(file: File) {
  return file.type === "video/mp4" || fileExtension(file) === "mp4";
}

function isImageFile(file: File) {
  return ["image/png", "image/jpeg", "image/gif"].includes(file.type) || ["png", "jpg", "jpeg", "gif"].includes(fileExtension(file));
}

function isSupportedEditorMedia(file: File) {
  return isAudioFile(file) || isVideoFile(file) || isImageFile(file);
}

function readAudioDuration(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    const finish = (seconds = 180) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 180);
    };
    const timeout = window.setTimeout(() => finish(), 1200);
    audio.addEventListener("loadedmetadata", () => {
      window.clearTimeout(timeout);
      finish(audio.duration);
    }, { once: true });
    audio.addEventListener("error", () => {
      window.clearTimeout(timeout);
      finish();
    }, { once: true });
  });
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

