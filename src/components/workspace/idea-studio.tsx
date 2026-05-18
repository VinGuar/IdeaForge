"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  type DeepPartial,
  type UIMessage,
} from "ai";
import { ideaReportSchema, type IdeaReport } from "@/lib/schemas/idea-report";
import { ideaDiscoverySchema, type DiscoveryIdea } from "@/lib/schemas/idea-discovery";
import type { ForgeThread } from "@/lib/workspace/types";
import { ReportPanel } from "@/components/workspace/report-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Lightbulb,
  Loader2,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Square,
  Target,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { StorageProvider, StoredMessage } from "@/lib/storage";

function textFromMessage(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

type Mode = "validate" | "discover";

const MESSAGE_SAVE_CAP = 60;

export function IdeaStudio({
  thread,
  onPatch,
  onLiveReport,
  onAnalyzingChange,
  storage,
  sidebarSlot,
}: {
  thread: ForgeThread;
  onPatch: (patch: Partial<ForgeThread>) => void;
  onLiveReport: (r: DeepPartial<IdeaReport> | undefined) => void;
  onAnalyzingChange?: (busy: boolean) => void;
  storage: StorageProvider;
  sidebarSlot?: ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("validate");
  const [topic, setTopic] = useState(thread.topic);
  const [founder, setFounder] = useState(thread.founderProfile);
  const [niche, setNiche] = useState("");
  const [refineInput, setRefineInput] = useState("");
  const [formCollapsed, setFormCollapsed] = useState(!!thread.report);
  const [chatWidth, setChatWidth] = useState(360);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startWidth: chatWidth };
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const delta = dragState.current.startX - ev.clientX;
      setChatWidth(Math.min(900, Math.max(160, dragState.current.startWidth + delta)));
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [chatWidth]);

  const reportSnapshotRef = useRef<{ value: unknown }>({
    value: thread.report ?? null,
  });

  const [transport] = useState(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, body }) => ({
          body: {
            ...body,
            messages,
            get reportSnapshot() {
              return reportSnapshotRef.current.value;
            },
          },
        }),
      }),
  );

  const [seedMessages, setSeedMessages] = useState<UIMessage[]>([]);

  // Load persisted messages once on mount
  useEffect(() => {
    storage.loadMessages(thread.id).then((stored) => {
      if (stored.length === 0) return;
      setSeedMessages(
        stored.map((m) => ({
          id: m.id,
          role: m.role,
          parts: [{ type: "text" as const, text: m.content }],
        })),
      );
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { messages, sendMessage, status, stop } = useChat<UIMessage>({
    id: thread.id,
    transport,
    messages: seedMessages,
  });

  // Persist messages when streaming finishes
  const chatBusyRef = useRef(false);
  useEffect(() => {
    const busy = status === "streaming" || status === "submitted";
    if (chatBusyRef.current && !busy && messages.length > 0) {
      const toStore: StoredMessage[] = messages
        .slice(-MESSAGE_SAVE_CAP)
        .map((m, i) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: textFromMessage(m),
          createdAt: Date.now() + i,
        }));
      void storage.saveMessages(thread.id, toStore);
    }
    chatBusyRef.current = busy;
  }, [status, messages, storage, thread.id]);

  // Validate mode: analyze a specific idea
  const {
    object: report,
    submit: submitAnalyze,
    isLoading: analyzing,
    error: analyzeError,
    clear: clearAnalyze,
    stop: stopAnalyze,
  } = useObject({
    api: "/api/analyze",
    schema: ideaReportSchema,
    initialValue: thread.report ?? undefined,
    onFinish: ({ object: finished }) => {
      if (finished) {
        onPatch({
          report: finished,
          title: finished.title.slice(0, 96),
          topic: topic.trim(),
          founderProfile: founder.trim(),
          updatedAt: Date.now(),
        });
      }
    },
  });

  // Discover mode: find ideas from niches/pain data
  const {
    object: discovery,
    submit: submitDiscover,
    isLoading: discovering,
    error: discoverError,
    clear: clearDiscover,
    stop: stopDiscover,
  } = useObject({
    api: "/api/discover",
    schema: ideaDiscoverySchema,
  });

  useEffect(() => {
    reportSnapshotRef.current.value = {
      topic: topic.trim(),
      founderProfile: founder.trim(),
      report: report ?? thread.report ?? null,
    };
  }, [report, thread.report, topic, founder]);

  useEffect(() => {
    onLiveReport(report);
  }, [report, onLiveReport]);

  useEffect(() => {
    onAnalyzingChange?.(analyzing);
  }, [analyzing, onAnalyzingChange]);

  useEffect(() => {
    if (report?.title) setFormCollapsed(true);
  }, [report?.title]);

  const runAnalyze = useCallback(() => {
    const t = topic.trim();
    if (!t) return;
    onPatch({ topic: t, founderProfile: founder.trim(), updatedAt: Date.now() });
    clearAnalyze();
    submitAnalyze({ topic: t, founderProfile: founder.trim() });
  }, [topic, founder, submitAnalyze, clearAnalyze, onPatch]);

  const runDiscover = useCallback(() => {
    clearDiscover();
    submitDiscover({ niche: niche.trim() });
  }, [niche, submitDiscover, clearDiscover]);

  const validateIdea = useCallback((idea: DiscoveryIdea) => {
    setMode("validate");
    setFormCollapsed(false);
    setTopic(`${idea.title} — ${idea.oneLiner}`);
  }, []);

  const resetSession = useCallback(() => {
    setTopic("");
    setFounder("");
    setNiche("");
    setFormCollapsed(false);
    clearAnalyze();
    onPatch({ report: null, title: "Untitled session", topic: "", founderProfile: "", updatedAt: Date.now() });
  }, [clearAnalyze, onPatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        const target = e.target as HTMLElement | null;
        if (target?.closest("[data-ideaforge-topic]")) {
          e.preventDefault();
          runAnalyze();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runAnalyze]);

  const chatBusy = status === "streaming" || status === "submitted";

  return (
    <div className="flex min-h-0 flex-1 overflow-x-hidden">
      {/* Center: form + results */}
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden">
        {/* Mode toggle + form */}
        <div className="glass-panel shrink-0 border-b border-border/70 px-5 py-3">
          {/* Collapsed summary bar */}
          {formCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{topic || "Untitled"}</p>
                {founder.trim() && (
                  <p className="truncate text-[11px] text-muted-foreground">{founder.slice(0, 80)}</p>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0 gap-1.5 text-xs text-muted-foreground"
                onClick={() => setFormCollapsed(false)}
              >
                <ChevronDown className="size-3.5" />
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0 gap-1.5 text-xs text-muted-foreground"
                onClick={resetSession}
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={analyzing || !topic.trim()}
                onClick={runAnalyze}
                className="shrink-0 gap-1.5"
              >
                {analyzing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Re-run
              </Button>
            </div>
          ) : (
          <>
          {/* Mode toggle */}
          <div className="mb-3 flex gap-1 rounded-lg border border-border/60 bg-muted/30 p-1 w-fit">
            <button
              type="button"
              onClick={() => setMode("validate")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                mode === "validate"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="size-3.5" />
              I have an idea
            </button>
            <button
              type="button"
              onClick={() => setMode("discover")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                mode === "discover"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lightbulb className="size-3.5" />
              Find me ideas
            </button>
          </div>

          {mode === "validate" ? (
            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="topic">Problem space / idea</Label>
                <Input
                  id="topic"
                  data-ideaforge-topic
                  placeholder='e.g. "An app that helps small restaurant owners manage reservations without paying for expensive software"'
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="founder">About you (optional)</Label>
                <Textarea
                  id="founder"
                  rows={2}
                  className="min-h-[64px] resize-none border-border/70 bg-background/65 text-sm"
                  placeholder="e.g. I can build basic websites, I have about 10 hours a week, a $200 budget, and I know a lot of people in the fitness industry"
                  value={founder}
                  onChange={(e) => setFounder(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={runAnalyze}
                  disabled={analyzing || !topic.trim()}
                  className="gap-2 shadow-md shadow-primary/20"
                >
                  {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {analyzing ? "Analyzing…" : "Run analysis"}
                </Button>
                {analyzing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => stopAnalyze()}
                  >
                    <Square className="size-3.5" />
                    Stop
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={resetSession}
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
              </div>
              {analyzeError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{analyzeError.message}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="niche">Niche, skills, or market</Label>
                <Textarea
                  id="niche"
                  rows={2}
                  className="min-h-[64px] resize-none border-border/70 bg-background/65 text-sm"
                  placeholder="e.g. fitness, pet care, restaurants, real estate, parenting... or leave blank and we'll find ideas across everything"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={runDiscover}
                  disabled={discovering}
                  className="gap-2 shadow-md shadow-primary/20"
                >
                  {discovering ? <Loader2 className="size-4 animate-spin" /> : <Lightbulb className="size-4" />}
                  {discovering ? "Finding ideas…" : "Find ideas"}
                </Button>
                {discovering && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => stopDiscover()}
                  >
                    <Square className="size-3.5" />
                    Stop
                  </Button>
                )}
              </div>
              {discoverError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{discoverError.message}</span>
                </div>
              )}
            </div>
          )}
          {/* Collapse button when form is expanded and report exists */}
          {!formCollapsed && (report?.title || thread.report) && (
            <button
              type="button"
              onClick={() => setFormCollapsed(true)}
              className="mt-3 flex w-full items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronUp className="size-3" />
              Collapse to see report
            </button>
          )}
          </>
          )}
        </div>

        {/* Results area */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {mode === "validate" ? (
            analyzing ? <AnalysisLoading /> : <ReportPanel partial={report} streaming={false} />
          ) : (
            <DiscoverResults
              ideas={discovery?.ideas ?? []}
              context={discovery?.searchContext}
              streaming={discovering}
              onValidate={validateIdea}
            />
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="group relative flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-muted transition-colors hover:bg-primary/25 active:bg-primary/40"
      >
        <GripVertical className="size-3 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
      </div>

      {/* Right: chat refiner */}
      <div className="flex shrink-0 flex-col min-h-0 glass-panel" style={{ width: chatWidth }}>
        <div className="shrink-0 border-b border-border/70 px-4 py-3">
          <p className="text-sm font-semibold">Ask IdeaForge</p>
          <p className="text-xs text-muted-foreground">
            Ask questions about the report, challenge assumptions, figure out your first steps, or bounce ideas on how to get started.
          </p>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-2 p-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Got a question about the report? Want to dig into a specific signal, challenge an assumption, explore how to validate cheaply, or think through how to actually start? Ask anything.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-6 bg-muted/60 text-foreground"
                    : "mr-6 bg-muted/30 text-foreground"
                }`}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.role === "user" ? "You" : "IdeaForge"}
                </p>
                <p className="whitespace-pre-wrap">{textFromMessage(m)}</p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <form
          className="shrink-0 border-t border-border/70 glass-panel p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const t = refineInput.trim();
            if (!t || chatBusy) return;
            setRefineInput("");
            await sendMessage({ text: t });
          }}
        >
          <div className="flex gap-2">
            <Textarea
              rows={4}
              className="min-h-[100px] flex-1 resize-y border-border/60 bg-background/50 text-sm"
              placeholder="Ask about the report, validation steps, how to start…"
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="flex shrink-0 flex-col gap-2">
              <Button
                type="submit"
                disabled={chatBusy || !refineInput.trim()}
                size="icon"
                className="size-10"
              >
                {chatBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SendHorizontal className="size-4" />
                )}
              </Button>
              {chatBusy && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10"
                  onClick={() => void stop()}
                >
                  <Square className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {sidebarSlot}
    </div>
  );
}

function AnalysisLoading() {
  const [progress, setProgress] = useState(2);
  const [stepIdx, setStepIdx] = useState(0);
  const steps = [
    "Fetching Reddit signals…",
    "Searching Hacker News…",
    "Scanning GitHub issues…",
    "Clustering pain points…",
    "Scoring market opportunity…",
    "Building your report…",
  ];

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p;
        return p + (92 - p) * 0.04;
      });
    }, 400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, steps.length - 1));
    }, 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-8">
      <div className="w-full max-w-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{steps[stepIdx]}</span>
          <span className="tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          Sourcing from Reddit · HN · GitHub · Stack Overflow
        </p>
      </div>
    </div>
  );
}

function DiscoverResults({
  ideas,
  context,
  streaming,
  onValidate,
}: {
  ideas: Array<Partial<DiscoveryIdea>>;
  context?: string;
  streaming: boolean;
  onValidate: (idea: DiscoveryIdea) => void;
}) {
  if (!streaming && ideas.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <Lightbulb className="size-10 opacity-30" />
        <p className="font-medium text-foreground">No ideas yet</p>
        <p>Enter a niche or leave blank, then click Find ideas.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-10">
        {context && (
          <p className="mb-4 text-xs text-muted-foreground">{context}</p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {ideas.map((idea, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/55 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-snug">{idea.title ?? "…"}</p>
                {typeof idea.opportunityScore === "number" && (
                  <Badge
                    className={`shrink-0 text-[10px] ${
                      idea.opportunityScore >= 70
                        ? "bg-emerald-600/25 text-emerald-200"
                        : idea.opportunityScore >= 45
                          ? "bg-amber-600/25 text-amber-200"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {idea.opportunityScore}/100
                  </Badge>
                )}
              </div>
              {idea.oneLiner && (
                <p className="text-xs text-muted-foreground">{idea.oneLiner}</p>
              )}
              {idea.targetAudience && (
                <p className="text-xs">
                  <span className="text-muted-foreground">For: </span>
                  {idea.targetAudience}
                </p>
              )}
              {idea.coreWedge && (
                <p className="text-xs">
                  <span className="text-muted-foreground">Wedge: </span>
                  {idea.coreWedge}
                </p>
              )}
              {idea.firstValidationStep && (
                <p className="rounded-md bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
                  {idea.firstValidationStep}
                </p>
              )}
              {idea.tags && idea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {idea.tags.map((tag, j) => (
                    <Badge key={j} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {idea.title && idea.oneLiner && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-1 gap-1.5 self-start text-xs"
                  onClick={() => onValidate(idea as DiscoveryIdea)}
                >
                  Validate this idea
                  <ArrowRight className="size-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

