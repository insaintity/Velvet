"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";

export function PrivateStudioLogin() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, email, password }) });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setError(body.error || "Velvet could not sign in.");
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    window.location.assign(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/projects/new");
  }

  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden p-5 text-white">
      <motion.div className="absolute inset-0" initial={{ scale: 1.025, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
        <Image src="/brand/velvet-studio-hero.webp" alt="" fill priority sizes="100vw" className="object-cover object-center" />
      </motion.div>
      <div className="login-hero-shade pointer-events-none absolute inset-0" />
      <motion.section aria-label="Velvet account login" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08, duration: 0.42, ease: [0.22, 1, 0.36, 1] }} className="panel glass-panel-strong relative w-full max-w-[420px] rounded-2xl p-7 shadow-[0_24px_90px_rgba(0,0,0,.38)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="brand-mark grid h-12 w-12 place-items-center rounded-lg border border-[rgba(239,99,152,.2)] bg-white/[.035]"><Image src="/brand/velvet-mark.png" alt="" width={38} height={38} priority /></span>
          <span><span className="block font-serif text-[34px] lowercase leading-none">velvet</span><span className="mt-1.5 block text-[9px] font-semibold uppercase tracking-[.16em] text-[var(--rose-soft)]">Private AI music foundry</span></span>
        </div>
        <div className="my-7 h-px bg-[var(--border)]" />
        <div className="flex items-center gap-2 text-[var(--rose-soft)]"><LockKeyhole className="h-4 w-4" /><h1 className="text-xs font-semibold uppercase tracking-[.13em] text-white">Velvet Account</h1></div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Log in with your Velvet username, verified email, and password.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Username<input autoFocus required type="text" autoComplete="username" placeholder="VelvetDEV" value={username} onChange={(event) => setUsername(event.target.value)} className="glass-control mt-2 h-11 w-full rounded-lg px-3 text-sm normal-case text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]" /></label>
          <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Verified email<input required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="glass-control mt-2 h-11 w-full rounded-lg px-3 text-sm normal-case text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]" /></label>
          <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Password<input required type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} className="glass-control mt-2 h-11 w-full rounded-lg px-3 text-sm normal-case text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]" /></label>
          <div aria-live="polite" className="mt-2 min-h-5 text-xs text-[var(--danger)]">{error}</div>
          <button disabled={busy || !username.trim() || !email.trim() || !password} className="glass-primary mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Signing in" : "Log in"}<ArrowRight className="h-4 w-4" /></button>
        </form>
      </motion.section>
    </main>
  );
}
