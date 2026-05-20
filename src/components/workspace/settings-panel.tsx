"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { saveFounderProfile, type FounderProfile } from "@/lib/profile/founder-profile";
import {
  ROLE_OPTIONS,
  MARKET_OPTIONS,
  TECH_OPTIONS,
  GOAL_OPTIONS,
  MONETIZATION_OPTIONS,
  MARKET_SET,
} from "@/lib/profile/options";
import { ChipGroup } from "@/components/ui/chip-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  LogOut,
  Pencil,
  Trash2,
  User as UserIcon,
} from "lucide-react";

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
      {children}
    </p>
  );
}

function ProfileSummary({ profile }: { profile: FounderProfile }) {
  const tags: string[] = [];
  if (profile.role) tags.push(profile.role);
  if (profile.technicalLevel?.length) tags.push(...profile.technicalLevel);
  if (profile.goal) tags.push(profile.goal);
  if (profile.monetizationPref) tags.push(profile.monetizationPref);
  const interestCount = profile.interests?.length ?? 0;
  if (interestCount > 0) tags.push(`${interestCount} market${interestCount !== 1 ? "s" : ""}`);

  if (tags.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No profile set yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 text-[11px] text-foreground/80"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function SettingsPanel({
  open,
  onOpenChange,
  user,
  founderProfile,
  onProfileUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  founderProfile: FounderProfile | null;
  onProfileUpdate: (profile: FounderProfile) => void;
}) {
  const [profileExpanded, setProfileExpanded] = useState(false);

  const [role, setRole] = useState("");
  const [markets, setMarkets] = useState<string[]>([]);
  const [customMarket, setCustomMarket] = useState("");
  const [technicalLevel, setTechnicalLevel] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [monetizationPref, setMonetizationPref] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync form to saved profile each time the sheet opens
  useEffect(() => {
    if (!open) return;
    setProfileExpanded(false);
    if (founderProfile) {
      setRole(founderProfile.role ?? "");
      const interests = founderProfile.interests ?? [];
      setMarkets(interests.filter((i) => MARKET_SET.has(i)));
      setCustomMarket(interests.filter((i) => !MARKET_SET.has(i)).join(", "));
      setTechnicalLevel(founderProfile.technicalLevel ?? []);
      setGoal(founderProfile.goal ?? "");
      setMonetizationPref(founderProfile.monetizationPref ?? "");
    } else {
      setRole("");
      setMarkets([]);
      setCustomMarket("");
      setTechnicalLevel([]);
      setGoal("");
      setMonetizationPref("");
    }
  }, [open, founderProfile]);

  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "deleting">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSaveProfile() {
    const supabase = createClient();
    if (!supabase) return;
    const allInterests = [
      ...markets,
      ...(customMarket.trim()
        ? customMarket.split(",").map((s) => s.trim()).filter(Boolean)
        : []),
    ];
    const updated: FounderProfile = {
      role,
      technicalLevel,
      interests: allInterests,
      goal,
      monetizationPref: monetizationPref || "Not sure yet",
      completedAt: founderProfile?.completedAt ?? new Date().toISOString(),
    };
    setSaving(true);
    await saveFounderProfile(supabase, user.id, updated);
    setSaving(false);
    setSaved(true);
    onProfileUpdate(updated);
    setProfileExpanded(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDeleteAccount() {
    setDeleteStep("deleting");
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setDeleteError(json.error ?? "Deletion failed."); setDeleteStep("confirm"); return; }
      window.location.href = "/";
    } catch {
      setDeleteError("Network error. Try again.");
      setDeleteStep("confirm");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 border-l p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/70 px-5 py-4">
          <SheetTitle className="text-sm font-semibold">Settings</SheetTitle>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="p-5 space-y-8">

            {/* ── Account ──────────────────────────────────────────────── */}
            <section className="space-y-3">
              <SectionLabel>Account</SectionLabel>
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
                  <UserIcon className="size-4" />
                </div>
                <p className="text-sm text-foreground truncate flex-1">{user.email}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => { window.location.href = "/auth/signout"; }}
              >
                <LogOut className="size-3.5" />
                Sign out
              </Button>
            </section>

            <Separator className="opacity-50" />

            {/* ── Founder Profile ───────────────────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <SectionLabel>Founder Profile</SectionLabel>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileExpanded((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors -mt-3"
                >
                  {profileExpanded ? (
                    <>
                      <ChevronUp className="size-3.5" />
                      Collapse
                    </>
                  ) : (
                    <>
                      <Pencil className="size-3" />
                      Edit
                    </>
                  )}
                </button>
              </div>

              {!profileExpanded && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setProfileExpanded(true)}
                  onKeyDown={(e) => e.key === "Enter" && setProfileExpanded(true)}
                  className="cursor-pointer rounded-xl border border-border/60 bg-card/40 px-4 py-3 space-y-2 hover:border-border/90 transition-colors"
                >
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">
                    Used by the Opportunity Engine to match ideas to you.
                  </p>
                  {founderProfile ? (
                    <ProfileSummary profile={founderProfile} />
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">
                      No profile set. Click to fill in your details.
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                    <ChevronDown className="size-3" />
                    Click to edit
                  </p>
                </div>
              )}

              {profileExpanded && (
                <div className="space-y-5">
                  <p className="text-xs text-muted-foreground -mt-1">
                    Used by the Opportunity Engine to generate ideas matched to you.
                  </p>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-foreground">What best describes you?</p>
                    <ChipGroup options={ROLE_OPTIONS} selected={role} onChange={(v) => setRole(v as string)} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">Markets you know from the inside</p>
                    <ChipGroup options={MARKET_OPTIONS} selected={markets} multi onChange={(v) => setMarkets(v as string[])} />
                    <Input
                      placeholder="Add your own (comma-separated)"
                      value={customMarket}
                      onChange={(e) => setCustomMarket(e.target.value)}
                      className="border-border/60 bg-background/60 text-sm h-8 text-xs mt-1"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-foreground">Technical ability</p>
                    <ChipGroup options={TECH_OPTIONS} selected={technicalLevel} multi onChange={(v) => setTechnicalLevel(v as string[])} />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-foreground">What are you building toward?</p>
                    <ChipGroup options={GOAL_OPTIONS} selected={goal} onChange={(v) => setGoal(v as string)} />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-foreground">Monetization preference</p>
                    <ChipGroup options={MONETIZATION_OPTIONS} selected={monetizationPref} onChange={(v) => setMonetizationPref(v as string)} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void handleSaveProfile()}
                      className="gap-2"
                    >
                      {saving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : saved ? (
                        <Check className="size-3.5 text-emerald-400" />
                      ) : null}
                      {saved ? "Saved!" : "Save profile"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => setProfileExpanded(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <Separator className="opacity-50" />

            {/* ── Danger Zone ───────────────────────────────────────────── */}
            <section className="space-y-3">
              <SectionLabel>Danger Zone</SectionLabel>

              {deleteStep === "idle" && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Delete account</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Permanently deletes your account, all sessions, all reports, and all chat history. This cannot be undone.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => setDeleteStep("confirm")}
                  >
                    <Trash2 className="size-3.5" />
                    Delete my account
                  </Button>
                </div>
              )}

              {(deleteStep === "confirm" || deleteStep === "deleting") && (
                <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-4 shrink-0 text-red-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-foreground">Are you sure?</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Everything goes: all your threads, reports, and chat history. There's no going back.
                      </p>
                    </div>
                  </div>
                  {deleteError && (
                    <p className="text-xs text-destructive">{deleteError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={deleteStep === "deleting"}
                      onClick={() => void handleDeleteAccount()}
                      className="gap-2"
                    >
                      {deleteStep === "deleting" && <Loader2 className="size-3.5 animate-spin" />}
                      Yes, delete everything
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deleteStep === "deleting"}
                      onClick={() => { setDeleteStep("idle"); setDeleteError(null); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </section>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
