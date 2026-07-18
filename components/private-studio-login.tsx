"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";

const rememberedLoginKey = "velvet:remembered-login";

export function PrivateStudioLogin() {
  const [mode, setMode] = useState<"login" | "signup" | "recover">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const autoLoginAttempted = useRef(false);

  function clearRememberedLogin() {
    window.localStorage.removeItem(rememberedLoginKey);
    setRememberLogin(false);
    setEmail("");
    setPassword("");
    setError("");
    autoLoginAttempted.current = false;
  }

  const submitLogin = useCallback(async (options?: { auto?: boolean }) => {
    if (mode !== "login" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    const endpoint = mode === "signup" ? "/api/auth/signup" : mode === "recover" ? "/api/auth/recover" : "/api/auth/login";
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, recoveryCode }) });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok && options?.auto) {
      window.localStorage.removeItem(rememberedLoginKey);
      setRememberLogin(false);
      setPassword("");
    }
    if (!response.ok) return setError(body.error || (mode === "signup" ? "Velvet could not create that account." : mode === "recover" ? "Velvet could not recover that account." : "Velvet could not sign in."));
    if (rememberLogin && mode === "login") {
      window.localStorage.setItem(rememberedLoginKey, JSON.stringify({ email, password }));
    } else if (mode === "login") {
      window.localStorage.removeItem(rememberedLoginKey);
    }
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    window.location.assign(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/projects/new");
  }, [confirmPassword, email, mode, password, recoveryCode, rememberLogin]);

  useEffect(() => {
    const raw = window.localStorage.getItem(rememberedLoginKey);
    if (!raw) return;
    let saved: { email?: string; password?: string };
    try {
      saved = JSON.parse(raw) as { email?: string; password?: string };
    } catch {
      window.localStorage.removeItem(rememberedLoginKey);
      return;
    }
    if (!saved.email || !saved.password) return;
    setEmail(saved.email);
    setPassword(saved.password);
    setRememberLogin(true);
  }, []);

  useEffect(() => {
    if (autoLoginAttempted.current || mode !== "login" || !rememberLogin || !email || !password) return;
    autoLoginAttempted.current = true;
    void submitLogin({ auto: true });
  }, [email, mode, password, rememberLogin, submitLogin]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await submitLogin();
  }

  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden p-5 text-white">
      <motion.div className="absolute inset-0" initial={{ scale: 1.025, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
        <Image src="/brand/velvet-studio-hero.webp" alt="" fill priority sizes="100vw" className="object-cover object-center" />
      </motion.div>
      <div className="login-hero-texture pointer-events-none absolute inset-0" />
      <div className="login-hero-shade pointer-events-none absolute inset-0" />
      <motion.section aria-label="Velvet account login" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08, duration: 0.42, ease: [0.22, 1, 0.36, 1] }} className="panel glass-panel-strong relative w-full max-w-[420px] rounded-2xl p-7 shadow-[0_24px_90px_rgba(0,0,0,.38)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="brand-mark grid h-12 w-12 place-items-center rounded-lg border border-[rgba(239,99,152,.2)] bg-white/[.035]"><Image src="/brand/velvet-mark.png" alt="" width={38} height={38} priority /></span>
          <span><span className="block font-serif text-[34px] lowercase leading-none">velvet</span><span className="mt-1.5 block text-[9px] font-semibold uppercase tracking-[.16em] text-[var(--rose-soft)]">Private AI music foundry</span></span>
        </div>
        <div className="my-7 h-px bg-[var(--border)]" />
        <div className="flex items-center gap-2 text-[var(--rose-soft)]"><LockKeyhole className="h-4 w-4" /><h1 className="text-xs font-semibold uppercase tracking-[.13em] text-white">Velvet Account</h1></div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{mode === "signup" ? "Create the owner account for this Velvet studio." : mode === "recover" ? "Reset the owner password with your recovery code." : "Log in with your Velvet email and password."}</p>
        <div className="mt-5 grid h-10 grid-cols-2 rounded-xl border border-[var(--border)] bg-black/15 p-1">
          {(["login", "signup"] as const).map((item) => <button key={item} type="button" onClick={() => { setMode(item); setError(""); }} className={`rounded-lg text-xs font-medium capitalize transition ${mode === item ? "bg-white/[.11] text-white" : "text-[var(--text-muted)] hover:text-white"}`}>{item === "signup" ? "Create account" : "Log in"}</button>)}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Email<input autoFocus required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="glass-control mt-2 h-11 w-full rounded-lg px-3 text-sm normal-case text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]" /></label>
          {mode === "recover" ? <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Recovery code<input required type="password" autoComplete="one-time-code" placeholder="Recovery code" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} className="glass-control mt-2 h-11 w-full rounded-lg px-3 text-sm normal-case text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]" /></label> : null}
          <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">{mode === "recover" ? "New password" : "Password"}<input required type="password" autoComplete={mode !== "login" ? "new-password" : "current-password"} placeholder={mode === "recover" ? "New password" : "Password"} value={password} onChange={(event) => setPassword(event.target.value)} className="glass-control mt-2 h-11 w-full rounded-lg px-3 text-sm normal-case text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]" /></label>
          {mode !== "login" ? <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Confirm password<input required type="password" autoComplete="new-password" placeholder="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="glass-control mt-2 h-11 w-full rounded-lg px-3 text-sm normal-case text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)]" /></label> : null}
          {mode === "login" ? <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-black/15 px-3 py-2 text-xs text-[var(--text-secondary)]"><span><span className="block text-white">Remember this account</span><span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">Auto-fill and sign in on this browser.</span></span><input type="checkbox" checked={rememberLogin} onChange={(event) => setRememberLogin(event.target.checked)} className="h-4 w-4 accent-[var(--rose-soft)]" /></label> : null}
          <div aria-live="polite" className="mt-2 min-h-5 text-xs text-[var(--danger)]">{error}</div>
          <button disabled={busy || !email.trim() || !password || (mode !== "login" && !confirmPassword) || (mode === "recover" && !recoveryCode)} className="glass-primary mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40">{busy ? (mode === "signup" ? "Creating" : mode === "recover" ? "Recovering" : "Signing in") : (mode === "signup" ? "Create account" : mode === "recover" ? "Recover account" : "Log in")}<ArrowRight className="h-4 w-4" /></button>
        </form>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => { setMode(mode === "recover" ? "login" : "recover"); setError(""); }} className="text-xs text-[var(--rose-soft)] hover:text-white">{mode === "recover" ? "Back to login" : "Lost access? Recover account"}</button>
          {mode === "login" && rememberLogin ? <button type="button" onClick={clearRememberedLogin} className="text-xs text-[var(--text-muted)] hover:text-white">Clear remembered login</button> : null}
        </div>
      </motion.section>
    </main>
  );
}
