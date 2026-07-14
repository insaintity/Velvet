"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";

export function PrivateStudioLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setError(body.error || "Velvet could not unlock the studio.");
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    window.location.assign(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard");
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden p-5 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(116,91,137,.14),transparent_36%,rgba(173,116,147,.09))]" />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="panel glass-panel-strong relative w-full max-w-[420px] rounded-2xl p-7 shadow-[0_24px_90px_rgba(0,0,0,.3)]">
        <div className="flex items-center gap-3">
          <span className="brand-mark grid h-12 w-12 place-items-center rounded-lg border border-[rgba(239,99,152,.2)] bg-white/[.035]"><Image src="/brand/velvet-mark.png" alt="" width={38} height={38} priority /></span>
          <span><span className="block font-serif text-[34px] lowercase leading-none">velvet</span><span className="mt-1.5 block text-[9px] font-semibold uppercase tracking-[.16em] text-[var(--rose-soft)]">Private AI music foundry</span></span>
        </div>
        <div className="my-7 h-px bg-[var(--border)]" />
        <div className="flex items-center gap-2 text-[var(--rose-soft)]"><LockKeyhole className="h-4 w-4" /><h1 className="text-xs font-semibold uppercase tracking-[.13em] text-white">Private studio</h1></div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Enter your studio password to continue.</p>
        <form onSubmit={submit} className="mt-5">
          <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Studio password<input autoFocus required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="glass-control mt-2 h-11 w-full rounded-lg px-3 text-sm normal-case text-white outline-none focus:border-[var(--border-active)]" /></label>
          <div aria-live="polite" className="mt-2 min-h-5 text-xs text-[var(--danger)]">{error}</div>
          <button disabled={busy || !password} className="glass-primary mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Unlocking" : "Enter studio"}<ArrowRight className="h-4 w-4" /></button>
        </form>
      </motion.section>
    </main>
  );
}
