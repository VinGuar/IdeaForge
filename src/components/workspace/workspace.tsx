"use client";

import type { DeepPartial } from "ai";
import type { User } from "@supabase/supabase-js";
import type { IdeaReport } from "@/lib/schemas/idea-report";
import type { ForgeThread } from "@/lib/workspace/types";
import { createClient } from "@/lib/supabase/client";
import {
  localProvider,
  createSupabaseProvider,
  type StorageProvider,
} from "@/lib/storage";
import { SignInDialog } from "@/components/auth/sign-in-sheet";
import { IdeaStudio } from "@/components/workspace/idea-studio";
import { ReportPanel } from "@/components/workspace/report-panel";
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
  PanelRight,
  Plus,
  Search,
  Star,
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

/** Sync all localStorage threads into Supabase once on first sign-in. */
async function syncLocalToSupabase(provider: StorageProvider) {
  const local = localProvider;
  const threads = await local.loadThreads();
  if (threads.length === 0) return;
  for (const t of threads) {
    await provider.upsertThread(t);
  }
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

  const providerRef = useRef<StorageProvider>(localProvider);

  // ── Auth state + provider switching ────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);

        if (nextUser) {
          const sbProvider = createSupabaseProvider(supabase, nextUser.id);
          const isNewSignIn = event === "SIGNED_IN";
          if (isNewSignIn) {
            // Merge any anonymous localStorage work into the cloud.
            await syncLocalToSupabase(sbProvider);
          }
          providerRef.current = sbProvider;
          const loaded = await sbProvider.loadThreads();
          if (loaded.length > 0) {
            const sorted = [...loaded].sort((a, b) => b.updatedAt - a.updatedAt);
            setThreads(sorted);
            setActiveId(sorted[0].id);
            setLiveReport(sorted[0].report ?? undefined);
          }
        } else {
          providerRef.current = localProvider;
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Initial load from localStorage (before auth resolves) ──────────────────
  useEffect(() => {
    localProvider.loadThreads().then((loaded) => {
      // Only seed from local if Supabase hasn't already hydrated threads.
      setThreads((prev) => {
        if (prev.length > 0) return prev;
        if (loaded.length === 0) {
          const first = newBlankThread();
          void localProvider.upsertThread(first);
          setActiveId(first.id);
          return [first];
        }
        const sorted = [...loaded].sort((a, b) => b.updatedAt - a.updatedAt);
        setActiveId(sorted[0].id);
        setLiveReport(sorted[0].report ?? undefined);
        return sorted;
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist patch to storage ───────────────────────────────────────────────
  const patchThread = useCallback((id: string, patch: Partial<ForgeThread>) => {
    setThreads((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
      );
      const updated = next.find((t) => t.id === id);
      if (updated) void providerRef.current.upsertThread(updated);
      return next;
    });
  }, []);

  const createThread = useCallback(() => {
    const t = newBlankThread();
    void providerRef.current.upsertThread(t);
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
      setActiveId(id);
      const t = threads.find((x) => x.id === id);
      setLiveReport(t?.report ?? undefined);
    },
    [threads],
  );

  const stableLiveReport = useCallback(
    (r: DeepPartial<IdeaReport> | undefined) => setLiveReport(r),
    [],
  );

  const stableAnalyzing = useCallback((v: boolean) => setAnalyzing(v), []);

  return (
    <div className="noise-overlay subtle-grid relative flex h-[100dvh] flex-col bg-background text-foreground">
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
          {!user && (
            <p className="hidden text-xs text-muted-foreground/70 sm:block">
              Sign in to save your work across devices
            </p>
          )}
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
          <SignInDialog />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {active ? (
          <IdeaStudio
            key={active.id}
            thread={active}
            onPatch={(p) => patchThread(active.id, p)}
            onLiveReport={stableLiveReport}
            onAnalyzingChange={stableAnalyzing}
            storage={providerRef.current}
            sidebarSlot={
              <aside
                className={`glass-panel flex shrink-0 flex-col border-x border-border/70 transition-[width] duration-200 ${
                  sidebarOpen ? "w-[200px]" : "w-12"
                } overflow-hidden`}
              >
                {sidebarOpen ? (
                  <div className="flex shrink-0 items-center gap-1.5 border-b border-border/70 p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setSidebarOpen(false)}
                      aria-label="Collapse sidebar"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 gap-1.5 shadow-sm"
                      onClick={createThread}
                    >
                      <Plus className="size-3.5" />
                      New
                    </Button>
                  </div>
                ) : (
                  <div className="flex shrink-0 flex-col items-center gap-1 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setSidebarOpen(true)}
                      aria-label="Expand sidebar"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={createThread}
                      aria-label="New thread"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                )}

                {sidebarOpen && (
                  <>
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
                            className={`group flex items-start gap-1 rounded-lg border px-2 py-2 text-left transition-all duration-150 hover:bg-muted/55 ${
                              t.id === activeId
                                ? "border-primary/40 bg-primary/10"
                                : "border-transparent"
                            }`}
                          >
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => selectThread(t.id)}
                            >
                              <div className="flex items-center gap-1">
                                <FileText className="size-3 shrink-0 text-muted-foreground" />
                                <span className="truncate text-xs font-medium">{t.title}</span>
                              </div>
                              {t.topic ? (
                                <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/80">
                                  {t.topic}
                                </p>
                              ) : null}
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className={`shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 ${
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
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </aside>
            }
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select or create a thread.
          </div>
        )}
      </div>
    </div>
  );
}
