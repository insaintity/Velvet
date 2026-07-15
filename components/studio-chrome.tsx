"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarClock, FolderKanban, History, Plus, Search, Settings, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const commands = [
  { label: "New Media", detail: "Create a song or album", href: "/projects/new", icon: Plus },
  { label: "Projects", detail: "Open recent work", href: "/projects", icon: FolderKanban },
  { label: "Scheduler", detail: "Plan YouTube uploads", href: "/publishing", icon: CalendarClock },
  { label: "Analytics", detail: "Review upload outcomes", href: "/analytics", icon: BarChart3 },
  { label: "History", detail: "Uploads and prompt versions", href: "/history", icon: History },
  { label: "Settings", detail: "Connections and studio setup", href: "/settings", icon: Settings }
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? commands.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(normalized)) : commands;
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-start bg-[rgba(19,14,28,.58)] px-4 pt-[12vh] backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Velvet commands"
            className="panel glass-panel-strong w-full max-w-[560px] overflow-hidden rounded-xl"
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex h-14 items-center gap-3 border-b border-[var(--border)] px-4">
              <Search className="h-4 w-4 text-[var(--rose-soft)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Velvet"
                aria-label="Search commands"
                className="command-search h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-[var(--text-muted)]"
              />
              <button onClick={onClose} title="Close command palette" aria-label="Close command palette" className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-2">
              {filtered.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div key={item.href} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.025 }}>
                    <Link href={item.href} onClick={onClose} className="flex h-12 items-center gap-3 rounded-lg px-3 hover:bg-white/[0.055]">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.04] text-[var(--rose-soft)]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-white">{item.label}</span>
                        <span className="block truncate text-xs text-[var(--text-muted)]">{item.detail}</span>
                      </span>
                      <span className="tabular text-[10px] text-[var(--text-muted)]">0{index + 1}</span>
                    </Link>
                  </motion.div>
                );
              })}
              {filtered.length === 0 ? <div className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">No matching commands</div> : null}
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ProjectArtwork({ title, compact = false }: { title: string; compact?: boolean }) {
  const hue = Array.from(title).reduce((total, char) => total + char.charCodeAt(0), 0) % 360;

  return (
    <div
      className={`artwork relative isolate overflow-hidden bg-[#111426] ${compact ? "aspect-square rounded-lg" : "aspect-square rounded-xl"}`}
      style={{
        backgroundImage: `radial-gradient(circle at 72% 18%, hsla(${hue}, 72%, 58%, .42), transparent 34%), radial-gradient(circle at 14% 86%, hsla(${(hue + 82) % 360}, 70%, 56%, .32), transparent 38%), linear-gradient(145deg, #161326, #090b16 64%)`
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(125deg,transparent_20%,rgba(255,255,255,0.045)_48%,transparent_70%)]" />
      <motion.div className="absolute inset-[20%]" animate={{ y: [0, -3, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
        <Image src="/brand/velvet-mark.png" alt="" fill sizes={compact ? "96px" : "280px"} className="object-contain opacity-90" />
      </motion.div>
      {!compact ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
          <div className="truncate text-sm font-medium text-white">{title}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Velvet release</div>
        </div>
      ) : null}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized.includes("complete") || normalized.includes("ready") || normalized.includes("rendered") || normalized.includes("connected")
      ? "border-[rgba(88,182,168,0.28)] bg-[rgba(88,182,168,0.09)] text-[var(--success)]"
      : normalized.includes("fail") || normalized.includes("error") || normalized.includes("attention")
        ? "border-[rgba(219,99,114,0.3)] bg-[rgba(219,99,114,0.09)] text-[var(--danger)]"
        : normalized.includes("running") || normalized.includes("generating") || normalized.includes("saving")
          ? "border-[rgba(86,182,206,0.3)] bg-[rgba(86,182,206,0.09)] text-[var(--cyan)]"
          : normalized.includes("blocked") || normalized.includes("missing")
            ? "border-[rgba(213,161,94,0.3)] bg-[rgba(213,161,94,0.09)] text-[var(--warning)]"
            : "border-[var(--border)] bg-white/[0.035] text-[var(--text-secondary)]";

  return <motion.span initial={false} animate={normalized.includes("approved") || normalized.includes("complete") ? { boxShadow: ["0 0 0 rgba(88,182,168,0)", "0 0 16px rgba(88,182,168,.16)", "0 0 0 rgba(88,182,168,0)"] } : {}} transition={{ duration: 1.2 }} className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${tone}`}>{status}</motion.span>;
}

const waveformHeights = [8, 13, 20, 12, 26, 17, 9, 23, 31, 18, 12, 27, 36, 22, 14, 29, 20, 10, 24, 33, 18, 12, 28, 39, 25, 14, 31, 21, 11, 26, 35, 19, 13, 30, 23, 9, 21, 29, 16, 11, 24, 18, 8, 15, 20, 12, 9, 14];

export function Waveform({ isPlaying, progress }: { isPlaying: boolean; progress: number }) {
  return (
    <div className="relative flex h-11 items-center gap-[3px] overflow-hidden" aria-hidden="true">
      {waveformHeights.map((height, index) => {
        const active = index / waveformHeights.length <= progress;
        return (
          <motion.span
            key={`${height}-${index}`}
            className={`w-[2px] shrink-0 rounded-full ${active ? "bg-[var(--rose-soft)]" : "bg-white/15"}`}
            animate={isPlaying ? { height: [height * 0.62, height, height * 0.76] } : { height }}
            transition={isPlaying ? { duration: 0.7 + (index % 5) * 0.08, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
          />
        );
      })}
      <div className="pointer-events-none absolute inset-y-0 w-px bg-white/80" style={{ left: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
    </div>
  );
}
