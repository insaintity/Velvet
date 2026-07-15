"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, WandSparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PromptProducer } from "@/components/prompt-producer";
import { useSetupOverview } from "@/components/setup-controller";

export function NewProjectWorkspace() {
  const setup = useSetupOverview();
  const [mediaType, setMediaType] = useState<"song" | "album">("song");
  const [brief, setBrief] = useState("");
  const [message, setMessage] = useState("Blueprint generation uses your encrypted OpenAI key after setup.");
  const [isCreating, setIsCreating] = useState(false);
  const [promptProducerOpen, setPromptProducerOpen] = useState(false);

  async function createBlueprint() {
    if (!setup.canCreate) {
      setMessage("Connect OpenAI in Settings before creating a blueprint.");
      return;
    }
    setIsCreating(true);
    setMessage("Creating blueprint...");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, mediaType })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Blueprint generation failed.");
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
        <section className="new-media-panel panel glass-panel-strong overflow-hidden rounded-xl">
          <div className="new-media-hero relative min-h-[168px] overflow-hidden p-6">
            <motion.div className="absolute inset-0" initial={{ scale: 1.035, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <Image src="/brand/velvet-studio-hero.webp" alt="Velvet recording studio" fill priority sizes="(min-width: 1280px) 760px, 100vw" className="object-cover object-center" />
            </motion.div>
            <div className="new-media-hero-shade absolute inset-0" />
            <div className="relative max-w-[620px]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rose-soft)]">New media</div>
              <h1 className="mt-2 text-[38px] font-semibold leading-[1.08] text-white">Describe the song or album.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">Choose the release type, then write the prompt. Mood, instrumentation, length and intended YouTube style are enough to begin.</p>
            </div>
          </div>
          <div className="p-6 pt-4">
          <div className="glass-control mt-5 grid h-12 grid-cols-2 rounded-xl p-1">
            {(["song", "album"] as const).map((type) => (
              <button key={type} type="button" onClick={() => setMediaType(type)} className={`rounded-lg text-sm font-medium capitalize transition ${mediaType === type ? "border border-white/[.15] bg-white/[.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-white"}`} aria-pressed={mediaType === type}>{type}</button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-muted)]">Production brief</span>
            <button type="button" onClick={() => setPromptProducerOpen(true)} className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border-active)] bg-[rgba(226,102,174,.08)] px-3 text-xs font-medium text-[var(--rose-soft)] transition hover:bg-[rgba(226,102,174,.14)]"><WandSparkles className="h-3.5 w-3.5" />Prompt Producer</button>
          </div>
          <textarea value={brief} onChange={(event) => setBrief(event.target.value)} className="glass-control mt-2 min-h-[180px] w-full resize-none rounded-xl p-4 text-sm leading-6 text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]" placeholder={mediaType === "song" ? "Example: A smoky late-night jazz single with slow saxophone, intimate piano, brushed drums, and a cinematic noir mood. Around four minutes." : "Example: A moody late-night jazz album with slow saxophone, intimate piano and brushed drums. Instrumental, cinematic, elegant, and made for a long-form YouTube release."} aria-label="Media brief" />
          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-xs leading-5 text-[var(--text-muted)]">{message}</p>
            <div className="flex shrink-0 items-center gap-2">
              {!setup.canCreate ? <Link href="/settings" className="text-xs text-[var(--rose-soft)]">Connect OpenAI</Link> : null}
              <button onClick={createBlueprint} disabled={isCreating || !setup.canCreate || !brief.trim()} title={!setup.canCreate ? "Connect OpenAI before creating a blueprint." : "Create a reviewable blueprint."} className="glass-primary flex h-12 items-center gap-2 rounded-lg px-5 font-medium disabled:cursor-not-allowed disabled:opacity-40">{isCreating ? "Creating..." : "Create Blueprint"}<ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
          </div>
        </section>
        <div className="hidden min-h-0 xl:block">
          <AnimatePresence mode="wait">
            {promptProducerOpen ? <PromptProducer key="prompt-producer" open mediaType={mediaType} onClose={() => setPromptProducerOpen(false)} onComplete={(prompt, source) => { setBrief(prompt); setMessage(source === "ai" ? "Prompt Producer created this brief with ChatGPT. Review or edit it before continuing." : "Prompt created. Review or edit it before continuing."); }} /> : (
              <motion.div key="new-media-guidance" className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Guidance title="Release type" body="Songs create one-track blueprints. Albums create a multi-track plan with YouTube-ready metadata." />
                <Guidance title="Optional" body="After the prompt, Velvet can ask for length, track count, vocals and workflow mode only if needed." />
                <Guidance title="Before generation" body="You will review the blueprint first. Music generation waits for ElevenLabs; publishing waits for YouTube." />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Guidance({ title, body }: { title: string; body: string }) {
  return <article className="panel rounded-xl p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--rose-soft)]" />{title}</div><p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{body}</p></article>;
}
