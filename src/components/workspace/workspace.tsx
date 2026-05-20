"use client";

import type { DeepPartial } from "ai";
import type { User } from "@supabase/supabase-js";
import type { UIMessage } from "ai";
import type { IdeaReport } from "@/lib/schemas/idea-report";
import type { ForgeThread } from "@/lib/workspace/types";
import { createClient } from "@/lib/supabase/client";
import {
  localProvider,
  createSupabaseProvider,
  type StorageProvider,
} from "@/lib/storage";
import { SignInCard, SignInDialog } from "@/components/auth/sign-in-sheet";
import { IdeaStudio } from "@/components/workspace/idea-studio";
import { ReportPanel } from "@/components/workspace/report-panel";
import { FounderProfileOnboarding } from "@/components/onboarding/founder-profile-onboarding";
import { SettingsPanel } from "@/components/workspace/settings-panel";
import {
  loadFounderProfile,
  saveFounderProfile,
  type FounderProfile,
} from "@/lib/profile/founder-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutPanelLeft,
  Loader2,
  PanelRight,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function newBlankThread(): ForgeThread {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return {
    id,
    title: "Untitled session",
    updatedAt: Date.now(),
    topic: "",
    founderProfile: "",
    pastedSignals: "",
    favorite: false,
    report: null,
  };
}


export function Workspace() {
  const [threads, setThreads] = useState<ForgeThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [liveReport, setLiveReport] = useState<DeepPartial<IdeaReport> | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeMessages, setActiveMessages] = useState<UIMessage[]>([]);
  const [messagesReady, setMessagesReady] = useState(false);
  const [founderProfile, setFounderProfile] = useState<FounderProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // providerRef for stable use inside callbacks; provider state for reactive prop passing
  const providerRef = useRef<StorageProvider>(localProvider);
  const [provider, setProvider] = useState<StorageProvider>(localProvider);
  // Track which user ID we've already wired up so INITIAL_SESSION + SIGNED_IN
  // don't both trigger a full provider switch and thread reload.
  const authedUserIdRef = useRef<string | null>(null);
  // When non-null, the messages effect skips its Supabase load and immediately
  // marks ready — used when messages are pre-loaded before an activeId change.
  const preloadedForRef = useRef<string | null>(null);
  // Mirror of threads state accessible inside callbacks without adding it to deps.
  const threadsRef = useRef<ForgeThread[]>([]);
  useEffect(() => { threadsRef.current = threads; }, [threads]);

  function switchProvider(p: StorageProvider) {
    providerRef.current = p;
    setProvider(p);
  }

  // ── Auth: single source of truth, no localStorage fallback ──────────────────
  // We wait for auth to resolve before showing anything. Once confirmed, all
  // reads/writes go exclusively to Supabase — localStorage is never used.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setAuthChecked(true); return; }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const nextUser = session?.user ?? null;

        if (!nextUser) {
          setUser(null);
          setAuthChecked(true);
          authedUserIdRef.current = null;
          return;
        }

        setUser(nextUser);
        setAuthChecked(true);

        // INITIAL_SESSION + SIGNED_IN both fire on mount — only wire up once.
        if (authedUserIdRef.current === nextUser.id) return;
        authedUserIdRef.current = nextUser.id;

        const sbProvider = createSupabaseProvider(supabase, nextUser.id);
        switchProvider(sbProvider);

        // Load founder profile — show onboarding if not set yet.
        loadFounderProfile(supabase, nextUser.id)
          .then((p) => {
            if (p) { setFounderProfile(p); }
            else { setShowOnboarding(true); }
          })
          .catch(() => { /* DB unreachable — skip onboarding silently */ });

        // Show a blank thread immediately so the UI is never blocked waiting
        // for a Supabase round-trip. We'll replace it once threads load.
        const placeholder = newBlankThread();
        preloadedForRef.current = placeholder.id;
        setActiveMessages([]);
        setThreads([placeholder]);
        setActiveId(placeholder.id);

        // Load real threads from Supabase in the background.
        sbProvider.loadThreads()
          .then((loaded) => {
            if (loaded.length > 0) {
              const sorted = [...loaded].sort((a, b) => b.updatedAt - a.updatedAt);
              setThreads(sorted);
              setActiveId(sorted[0].id);
              setLiveReport(sorted[0].report ?? undefined);
            } else {
              // No existing threads — persist the placeholder we already showed.
              void sbProvider.upsertThread(placeholder);
            }
          })
          .catch(() => {
            // Supabase unreachable — keep the placeholder; it will be saved
            // to Supabase on the user's first patchThread call.
            void sbProvider.upsertThread(placeholder);
          });
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Load messages when active thread or provider changes ──────────────────
  useEffect(() => {
    if (!activeId) return;

    // Messages were pre-loaded by a thread switch (delete / select / create).
    // Skip the Supabase round-trip and mark ready immediately.
    if (preloadedForRef.current === activeId) {
      preloadedForRef.current = null;
      setMessagesReady(true);
      return;
    }

    let cancelled = false;
    setMessagesReady(false);

    // Safety valve: unblock after 4 s if Supabase stalls.
    const timeout = setTimeout(() => {
      if (!cancelled) { setActiveMessages([]); setMessagesReady(true); }
    }, 4000);

    providerRef.current.loadMessages(activeId)
      .then((stored) => {
        clearTimeout(timeout);
        if (cancelled) return;
        setActiveMessages(
          stored.map((m) => ({
            id: m.id,
            role: m.role,
            parts: [{ type: "text" as const, text: m.content }],
          })),
        );
        setMessagesReady(true);
      })
      .catch(() => {
        clearTimeout(timeout);
        if (!cancelled) { setActiveMessages([]); setMessagesReady(true); }
      });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [activeId, provider]); // provider dep ensures reload when auth resolves

  // ── Persist patch to storage ───────────────────────────────────────────────
  const patchThread = useCallback((id: string, patch: Partial<ForgeThread>) => {
    let toSave: ForgeThread | undefined;
    setThreads((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...patch, updatedAt: Date.now() };
        toSave = updated;
        return updated;
      });
      return next;
    });
    if (toSave) void providerRef.current.upsertThread(toSave);
  }, []);

  const deleteThread = useCallback((id: string) => {
    void providerRef.current.deleteThread(id);

    if (activeId !== id) {
      setThreads((prev) => prev.filter((t) => t.id !== id));
      return;
    }

    // Deleting the active thread — identify the fallback now, then preload its
    // messages before switching so the UI never shows a spinner.
    const next = threadsRef.current.filter((t) => t.id !== id);
    const fallback = next[0] ?? null;

    if (!fallback) {
      const blank = newBlankThread();
      void providerRef.current.upsertThread(blank);
      preloadedForRef.current = blank.id;
      setActiveMessages([]);
      setActiveId(blank.id);
      setLiveReport(undefined);
      setThreads([blank]);
      return;
    }

    // Keep the current thread visible while we preload the fallback's messages.
    // Once loaded, update everything in a single batch → no spinner, instant switch.
    providerRef.current.loadMessages(fallback.id)
      .then((stored) => {
        preloadedForRef.current = fallback.id;
        setActiveMessages(stored.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          parts: [{ type: "text" as const, text: m.content }],
        })));
        setLiveReport(fallback.report ?? undefined);
        setActiveId(fallback.id);
        setThreads(next);
      })
      .catch(() => {
        setActiveId(fallback.id);
        setLiveReport(fallback.report ?? undefined);
        setThreads(next);
      });
  }, [activeId]);

  const createThread = useCallback(() => {
    const t = newBlankThread();
    void providerRef.current.upsertThread(t);
    // New thread has no messages — preload empty so the effect skips Supabase.
    preloadedForRef.current = t.id;
    setActiveMessages([]);
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    setLiveReport(undefined);
    setSheetOpen(false);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setThreads((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, favorite: !t.favorite, updatedAt: Date.now() } : t,
      );
      const updated = next.find((t) => t.id === id);
      if (updated) void providerRef.current.upsertThread(updated);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        createThread();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createThread]);

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) ?? null,
    [threads, activeId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.topic.toLowerCase().includes(q),
    );
  }, [threads, query]);

  const selectThread = useCallback(
    (id: string) => {
      if (id === activeId) return;
      const t = threadsRef.current.find((x) => x.id === id);
      if (!t) return;
      setActiveId(id);
      setLiveReport(t.report ?? undefined);
    },
    [activeId],
  );

  const stableLiveReport = useCallback(
    (r: DeepPartial<IdeaReport> | undefined) => setLiveReport(r),
    [],
  );

  const stableAnalyzing = useCallback((v: boolean) => setAnalyzing(v), []);

  // Full-screen spinner while we wait for Supabase auth to resolve
  if (!authChecked) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Auth gate — show sign-in screen until user is confirmed
  if (!user) {
    return (
      <div className="noise-overlay subtle-grid relative flex h-[100dvh] flex-col items-center justify-center bg-background text-foreground">
        <div className="mb-8 text-center">
          <p className="text-2xl font-bold tracking-tight">IdeaForge</p>
          <p className="mt-1 text-sm text-muted-foreground">Validate demand before you ship.</p>
        </div>
        <div className="w-full max-w-sm px-4">
          <SignInCard />
        </div>
      </div>
    );
  }

  return (
    <div className="noise-overlay subtle-grid relative flex h-[100dvh] flex-col bg-background text-foreground">
      {showOnboarding && user && (
        <FounderProfileOnboarding
          onComplete={(profile) => {
            setFounderProfile(profile);
            setShowOnboarding(false);
            const supabase = createClient();
            if (supabase) void saveFounderProfile(supabase, user.id, profile);
          }}
          onSkip={() => setShowOnboarding(false)}
        />
      )}
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-background px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <LayoutPanelLeft className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight">
              IdeaForge
            </p>
            <p className="truncate text-[11px] text-muted-foreground/90">
              Validate demand before you ship.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-border/70 bg-background/70 md:hidden"
              onClick={() => setSheetOpen(true)}
            >
              <PanelRight className="size-3.5" />
              Report
            </Button>
            <SheetContent
              side="right"
              className="flex h-full w-full flex-col gap-0 border-l p-0 sm:max-w-xl"
            >
              <SheetHeader className="border-b px-4 py-3 text-left">
                <SheetTitle className="text-sm font-semibold">
                  Live report
                </SheetTitle>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ReportPanel partial={liveReport} streaming={analyzing} />
              </div>
            </SheetContent>
          </Sheet>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <Settings className="size-4 text-muted-foreground" />
          </Button>
          <SignInDialog user={user} />
        </div>
      </header>

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
        founderProfile={founderProfile}
        onProfileUpdate={setFounderProfile}
      />

      <div className="flex min-h-0 flex-1">
        {/* Sidebar — always visible regardless of loading state */}
        <aside
          className={`flex shrink-0 flex-col border-r border-border/70 bg-card transition-[width] duration-200 ${
            sidebarOpen ? "w-[240px]" : "w-12"
          } overflow-hidden`}
        >
          <div className={`flex shrink-0 border-b border-border/70 ${sidebarOpen ? "flex-row items-center gap-1 px-2 py-2" : "flex-col items-center gap-1 py-2"}`}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={createThread}
              aria-label="New session"
            >
              <Plus className="size-4" />
            </Button>
            {sidebarOpen && (
              <p className="ml-1 truncate text-[11px] font-semibold text-muted-foreground">
                Sessions
              </p>
            )}
          </div>

          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex flex-1 cursor-pointer items-center justify-center"
              aria-label="Open sessions sidebar"
            >
              <span className="select-none text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 [writing-mode:vertical-rl] rotate-180">
                Sessions
              </span>
            </button>
          )}

          {sidebarOpen && (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] text-muted-foreground/60 leading-relaxed">
                Your saved idea sessions. Each one stores the full report and chat history.
              </p>
              <div className="border-b border-border/70 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search..."
                    className="h-8 border-border/70 bg-background/60 pl-8 text-xs"
                  />
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-0.5 p-2">
                  {filtered.map((t) => (
                    <div
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectThread(t.id)}
                      onKeyDown={(e) => e.key === "Enter" && selectThread(t.id)}
                      className={`group flex cursor-pointer items-start gap-1 rounded-lg border px-2 py-2 text-left transition-all duration-150 hover:bg-muted/55 ${
                        t.id === activeId
                          ? "border-primary/40 bg-primary/10"
                          : "border-transparent"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <FileText className="size-3 shrink-0 text-muted-foreground" />
                          <span className="truncate text-xs font-medium">{t.title}</span>
                        </div>
                        {t.topic ? (
                          <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/80">
                            {t.topic}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className={`opacity-30 hover:opacity-100 ${
                            t.favorite ? "!opacity-100 text-amber-400" : ""
                          }`}
                          aria-label={t.favorite ? "Unfavorite" : "Favorite"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(t.id);
                          }}
                        >
                          <Star
                            className="size-3"
                            fill={t.favorite ? "currentColor" : "none"}
                          />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-30 hover:opacity-100 hover:text-destructive"
                          aria-label="Delete session"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThread(t.id);
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </aside>

        {/* Main content */}
        {active && messagesReady ? (
          <IdeaStudio
            key={active.id}
            thread={active}
            onPatch={(p) => patchThread(active.id, p)}
            onLiveReport={stableLiveReport}
            onAnalyzingChange={stableAnalyzing}
            storage={provider}
            initialMessages={activeMessages}
            onNewThread={createThread}
            founderProfile={founderProfile}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
