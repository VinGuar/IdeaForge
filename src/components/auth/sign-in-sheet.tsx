"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";

// ── Password rules ──────────────────────────────────────────────────────────
function validatePassword(p: string): string | null {
  if (p.length < 8) return "Must be at least 8 characters.";
  if (!/[A-Z]/.test(p)) return "Must contain an uppercase letter.";
  if (!/[0-9]/.test(p)) return "Must contain a number.";
  if (!/[^a-zA-Z0-9]/.test(p)) return "Must contain a symbol (e.g. ! @ # $).";
  return null;
}

// ── Sign-in dialog button in the nav bar ────────────────────────────────────
export function SignInDialog({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);

  if (user) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => { window.location.href = "/auth/signout"; }}
      >
        <LogOut className="size-3.5" />
        Sign out
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <LogIn className="size-3.5" />
        Sign in
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm">
            <SignInCard onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

// ── Reusable sign-in / sign-up card ─────────────────────────────────────────
export function SignInCard({ onClose }: { onClose?: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  const supabase = createClient();

  async function handleGoogle() {
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/workspace` },
    });
    setBusy(false);
    if (error) setMsg({ text: error.message, error: true });
  }

  async function handleEmailAuth() {
    if (!supabase || !email.trim() || !password) return;

    if (mode === "signup") {
      const pwErr = validatePassword(password);
      if (pwErr) { setMsg({ text: pwErr, error: true }); return; }
      if (password !== confirmPassword) {
        setMsg({ text: "Passwords do not match.", error: true });
        return;
      }
    }

    setBusy(true);
    setMsg(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setBusy(false);
      if (error) setMsg({ text: error.message, error: true });
      else setMsg({ text: "Check your email to confirm your account.", error: false });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) setMsg({ text: error.message, error: true });
      else onClose?.();
    }
  }

  if (!isSupabaseConfigured() || !supabase) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
        Add <code className="rounded bg-muted px-1 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-muted px-1 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
        <code className="rounded bg-muted px-1 text-xs">.env</code>, then restart.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-xl">
      <div className="border-b border-border/70 px-6 py-5">
        <p className="text-base font-semibold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {mode === "signin"
            ? "Sign in to access your saved reports and sessions."
            : "Save reports, revisit sessions, and access from any device."}
        </p>
      </div>

      <div className="flex flex-col gap-4 px-6 py-5">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          className="w-full gap-2"
          onClick={() => void handleGoogle()}
        >
          <svg className="size-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <Separator className="flex-1" />
          or email and password
          <Separator className="flex-1" />
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "Min 8 chars, uppercase, number, symbol" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleEmailAuth(); }}
            />
          </div>

          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-confirm">Confirm password</Label>
              <Input
                id="auth-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleEmailAuth(); }}
              />
            </div>
          )}
        </div>

        {msg && (
          <p className={`text-xs ${msg.error ? "text-destructive" : "text-emerald-400"}`}>
            {msg.text}
          </p>
        )}

        <Button
          type="button"
          disabled={busy || !email.trim() || !password}
          className="w-full"
          onClick={() => void handleEmailAuth()}
        >
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-foreground hover:underline"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>

        {onClose && (
          <button
            type="button"
            className="text-center text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
