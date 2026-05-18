"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LogIn } from "lucide-react";
import { useState } from "react";

export function SignInDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const supabase = createClient();

  async function google() {
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    setBusy(false);
    if (error) setMsg(error.message);
  }

  async function magicLink() {
    if (!supabase || !email.trim()) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setBusy(false);
    if (error) setMsg(error.message);
    else setMsg("Check your inbox for the magic link.");
  }

  async function anonymous() {
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      setMsg("Anonymous session ready — upgrade later to keep cloud history.");
      setOpen(false);
    }
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save sessions to the cloud</DialogTitle>
            <DialogDescription>
              Optional — IdeaForge works locally until Supabase is configured.
              Enable{" "}
              <span className="font-medium text-foreground">
                Anonymous sign-ins
              </span>{" "}
              in Supabase Auth settings for frictionless trials.
            </DialogDescription>
          </DialogHeader>

          {!isSupabaseConfigured() || !supabase ? (
            <p className="text-sm text-muted-foreground">
              Set{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              from{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                .env.local
              </code>
              , then restart Next.js.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                className="w-full"
                onClick={() => void google()}
              >
                Continue with Google
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                or email magic link
              </p>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@founder.io"
                />
              </div>
              <Button
                type="button"
                disabled={busy || !email.trim()}
                className="w-full"
                onClick={() => void magicLink()}
              >
                Send magic link
              </Button>

              <Separator />

              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="w-full"
                onClick={() => void anonymous()}
              >
                Continue anonymously
              </Button>

              {msg ? (
                <p className="text-xs text-muted-foreground">{msg}</p>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
