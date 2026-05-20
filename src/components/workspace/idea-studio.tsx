"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  type DeepPartial,
  type UIMessage,
} from "ai";
import { ideaReportSchema, type IdeaReport } from "@/lib/schemas/idea-report";
import { ideaDiscoverySchema, type DiscoveryIdea, type IdeaDiscovery } from "@/lib/schemas/idea-discovery";
import { ideaFinisherSchema } from "@/lib/schemas/idea-finisher";
import { founderProfileToText, type FounderProfile } from "@/lib/profile/founder-profile";
import type { ForgeThread } from "@/lib/workspace/types";
import { ReportPanel } from "@/components/workspace/report-panel";
import { FinisherBlueprint } from "@/components/workspace/finisher-blueprint";
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
  MessageSquare,
  Rocket,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Square,
  Target,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { StorageProvider, StoredMessage } from "@/lib/storage";

function textFromMessage(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

type Mode = "create" | "validate" | "finish";

const MESSAGE_SAVE_CAP = 60;
const MESSAGE_CAP = 20;
const CREATE_CAP = 6;

const CHAT_META: Record<Mode, { title: string; description: string; placeholder: string; emptyState: string }> = {
  create: {
    title: "Brainstorm with IdeaForge",
    description: "Tell me about your skills, interests, or a market you want to explore. I'll help you find startup ideas worth pursuing.",
    placeholder: "e.g. I know poker and AI. What SaaS could I build? Or: I want problems worth solving in healthcare…",
    emptyState: "Tell me about your background, skills, or what markets excite you. I'll help surface startup ideas tailored to you.",
  },
  validate: {
    title: "Ask IdeaForge",
    description: "Ask questions about the report, challenge assumptions, or think through your first steps.",
    placeholder: "Ask about the report, validation steps, how to start…",
    emptyState: "Got a question about the report? Want to dig into a specific signal, challenge an assumption, or think through how to actually start? Ask anything.",
  },
  finish: {
    title: "Blueprint Chat",
    description: "Ask follow-up questions about the blueprint, request specific changes, or go deeper on any section.",
    placeholder: "e.g. Can you expand the wedge strategy? Or: Suggest a tighter MVP scope.",
    emptyState: "The blueprint is your starting point. Use the chat to adjust any section, go deeper on a specific decision, or explore alternatives.",
  },
};

const CHAT_DEFAULT_WIDTHS: Record<Mode, number> = {
  create: 360,
  validate: 360,
  finish: 340,
};

export function IdeaStudio({
  thread,
  onPatch,
  onLiveReport,
  onAnalyzingChange,
  storage,
  initialMessages,
  onNewThread,
  founderProfile,
}: {
  thread: ForgeThread;
  onPatch: (patch: Partial<ForgeThread>) => void;
  onLiveReport: (r: DeepPartial<IdeaReport> | undefined) => void;
  onAnalyzingChange?: (busy: boolean) => void;
  storage: StorageProvider;
  initialMessages?: UIMessage[];
  onNewThread?: () => void;
  founderProfile?: FounderProfile | null;
}) {
  const [mode, setMode] = useState<Mode>("validate");
  const modeRef = useRef<Mode>("validate");
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const [selectedDiscoveryIdea, setSelectedDiscoveryIdea] = useState<DiscoveryIdea | null>(null);

  const [topic, setTopic] = useState(thread.topic);
  const [founder, setFounder] = useState(thread.founderProfile);
  const [niche, setNiche] = useState("");
  const [refineInput, setRefineInput] = useState("");
  const [formCollapsed, setFormCollapsed] = useState(!!thread.report);
  const [chatWidth, setChatWidth] = useState(360);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    setChatWidth(CHAT_DEFAULT_WIDTHS[mode]);
    if (mode !== "create") setSelectedDiscoveryIdea(null);
  }, [mode]);

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
            get chatMode() { return modeRef.current; },
            get reportSnapshot() { return reportSnapshotRef.current.value; },
          },
        }),
      }),
  );

  const { messages, sendMessage, status, stop } = useChat<UIMessage>({
    id: thread.id,
    transport,
    messages: initialMessages ?? [],
  });

  const threadRef = useRef(thread);
  useEffect(() => { threadRef.current = thread; });

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
      const t = threadRef.current;
      void storage.upsertThread(t).then(() =>
        storage.saveMessages(t.id, toStore)
      );
    }
    chatBusyRef.current = busy;
  }, [status, messages, storage, thread.id]);

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
    onFinish: ({ object: finished }: { object: IdeaReport | undefined; error: unknown }) => {
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

  const {
    object: blueprint,
    submit: submitFinisher,
    isLoading: generating,
    clear: clearBlueprint,
  } = useObject({
    api: "/api/finish",
    schema: ideaFinisherSchema,
  });

  useEffect(() => {
    reportSnapshotRef.current.value = {
      topic: topic.trim(),
      founderProfile: founder.trim(),
      report: report ?? thread.report ?? null,
      blueprint: blueprint ?? null,
      selectedDiscoveryIdea: selectedDiscoveryIdea ?? null,
    };
  }, [report, thread.report, topic, founder, blueprint, selectedDiscoveryIdea]);

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
    submitDiscover({
      niche: niche.trim(),
      founderProfileText: founderProfile ? founderProfileToText(founderProfile) : undefined,
    });
  }, [niche, founderProfile, submitDiscover, clearDiscover]);

  const runFinisher = useCallback(() => {
    const t = (topic.trim() || thread.topic).trim();
    if (!t) return;
    clearBlueprint();
    submitFinisher({
      topic: t,
      founderProfile: founder.trim() || undefined,
      report: thread.report ?? undefined,
    });
  }, [topic, founder, thread, submitFinisher, clearBlueprint]);

  const validateIdea = useCallback((idea: DiscoveryIdea) => {
    setMode("validate");
    setFormCollapsed(false);
    setTopic(`${idea.title}: ${idea.oneLiner}`);
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
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const effectiveCap = mode === "create" ? CREATE_CAP : MESSAGE_CAP;
  const atCap = userMessageCount >= effectiveCap;
  const chatMeta = CHAT_META[mode];
  const activeReport = report ?? (thread.report ? thread.report : undefined);

  return (
    <div className="flex min-h-0 flex-1 overflow-x-hidden">
      {/* Left: form + results */}
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden">

        {/* Top panel: mode toggle + mode-specific form */}
        <div className="glass-panel shrink-0 border-b border-border/70 px-5 py-3">

          {/* Mode toggle — always visible */}
          <div className="mb-3 flex gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 w-fit">
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                mode === "create"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-3.5" />
              Create / Find
            </button>
            <button
              type="button"
              onClick={() => setMode("validate")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                mode === "validate"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="size-3.5" />
              Validate Idea
            </button>
            <button
              type="button"
              onClick={() => setMode("finish")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                mode === "finish"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Rocket className="size-3.5" />
              Idea Finisher
            </button>
          </div>

          {/* CREATE mode form */}
          {mode === "create" && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Brainstorm with the chat on the right, or use the form below to generate a grid of ideas from your niche or skills.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="niche">Niche, skills, or market</Label>
                <Textarea
                  id="niche"
                  rows={2}
                  className="min-h-[64px] resize-none border-border/70 bg-background/65 text-sm"
                  placeholder="e.g. fitness, pet care, restaurants, real estate, parenting… or leave blank to explore across everything"
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
                  {discovering ? "Finding ideas…" : "Generate ideas"}
                </Button>
                {discovering && (
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => stopDiscover()}>
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

          {/* VALIDATE mode form */}
          {mode === "validate" && (
            formCollapsed ? (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{topic || "Untitled"}</p>
                  {founder.trim() && (
                    <p className="truncate text-[11px] text-muted-foreground">{founder.slice(0, 80)}</p>
                  )}
                </div>
                <Button
                  type="button" size="sm" variant="ghost"
                  className="shrink-0 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => setFormCollapsed(false)}
                >
                  <ChevronDown className="size-3.5" />
                  Edit
                </Button>
                <Button
                  type="button" size="sm" variant="ghost"
                  className="shrink-0 gap-1.5 text-xs text-muted-foreground"
                  onClick={resetSession}
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
                <Button
                  type="button" size="sm"
                  disabled={analyzing || !topic.trim()}
                  onClick={runAnalyze}
                  className="shrink-0 gap-1.5"
                >
                  {analyzing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  Re-run
                </Button>
              </div>
            ) : (
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
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => stopAnalyze()}>
                      <Square className="size-3.5" />
                      Stop
                    </Button>
                  )}
                  <Button
                    type="button" variant="ghost" size="sm"
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
                {(report?.title || thread.report) && (
                  <button
                    type="button"
                    onClick={() => setFormCollapsed(true)}
                    className="mt-1 flex w-full items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronUp className="size-3" />
                    Collapse to see report
                  </button>
                )}
              </div>
            )
          )}

          {/* FINISH mode bar */}
          {mode === "finish" && (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                {activeReport?.title || topic ? (
                  <>
                    <p className="truncate text-sm font-medium">{activeReport?.title || topic}</p>
                    {typeof activeReport?.validationQuality?.buildGateScore === "number" && (
                      <p className="text-[11px] text-muted-foreground">
                        Validated:{" "}
                        <span className={`font-semibold ${
                          activeReport.validationQuality.buildGateScore >= 65 ? "text-emerald-400" :
                          activeReport.validationQuality.buildGateScore >= 40 ? "text-amber-400" : "text-red-400"
                        }`}>
                          {activeReport.validationQuality.buildGateScore}/100
                        </span>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No idea yet. Validate one first or add a topic in Validate mode.</p>
                )}
              </div>
              {(activeReport?.title || topic.trim() || thread.topic) ? (
                <>
                  <Button
                    type="button" size="sm" variant="ghost"
                    className="shrink-0 gap-1.5 text-xs text-muted-foreground"
                    onClick={resetSession}
                  >
                    <RotateCcw className="size-3.5" />
                    Reset
                  </Button>
                  <Button
                    type="button" size="sm"
                    disabled={generating}
                    onClick={blueprint ? () => runFinisher() : runFinisher}
                    className="shrink-0 gap-1.5"
                  >
                    {generating
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <Rocket className="size-3.5" />
                    }
                    {blueprint ? "Regenerate" : "Generate Blueprint"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button" size="sm" variant="outline"
                  className="shrink-0 gap-1.5 text-xs"
                  onClick={() => setMode("validate")}
                >
                  <Target className="size-3.5" />
                  Validate first
                </Button>
              )}
            </div>
          )}

        </div>

        {/* Results area */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {mode === "create" ? (
            <DiscoverResults
              data={discovery as DeepPartial<IdeaDiscovery> | undefined}
              streaming={discovering}
              onValidate={validateIdea}
              onSelect={(idea) => setSelectedDiscoveryIdea(idea)}
              selectedTitle={selectedDiscoveryIdea?.title}
              hasProfile={!!founderProfile}
            />
          ) : mode === "validate" ? (
            analyzing ? <AnalysisLoading /> : <ReportPanel partial={report} streaming={false} onSwitchToFinisher={() => setMode("finish")} />
          ) : (
            <FinisherBlueprint
              blueprint={blueprint}
              generating={generating}
              onGenerate={runFinisher}
              onRegenerate={runFinisher}
              canGenerate={!!(activeReport?.title || topic.trim() || thread.topic)}
              ideaTitle={activeReport?.title || topic || thread.topic}
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

      {/* Right: chat panel */}
      <div className="flex shrink-0 flex-col min-h-0 glass-panel" style={{ width: chatWidth }}>
        <div className="shrink-0 border-b border-border/70 px-4 py-3">
          <p className="text-sm font-semibold">{chatMeta.title}</p>
          <p className="text-xs text-muted-foreground">{chatMeta.description}</p>
        </div>

        {/* Selected idea banner — create mode only */}
        {mode === "create" && selectedDiscoveryIdea && (
          <div className="shrink-0 border-b border-border/60 bg-primary/[0.06] px-3 py-2 flex items-start gap-2">
            <Lightbulb className="size-3.5 shrink-0 mt-0.5 text-primary/70" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{selectedDiscoveryIdea.title}</p>
              <p className="text-[11px] text-muted-foreground">Discussing this idea</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDiscoveryIdea(null)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              aria-label="Clear selected idea"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-2 p-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {mode === "create" && selectedDiscoveryIdea
                  ? `Let's talk about "${selectedDiscoveryIdea.title}". Ask me anything: target user, how to validate it cheaply, first steps, whether it's worth pursuing.`
                  : chatMeta.emptyState}
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
                <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:leading-relaxed [&_p]:mb-2 [&_ul]:my-2 [&_ul]:pl-4 [&_ol]:my-2 [&_ol]:pl-4 [&_li]:my-1 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_strong]:font-semibold">
                  <ReactMarkdown>{textFromMessage(m)}</ReactMarkdown>
                </div>
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
            if (!t || chatBusy || atCap) return;
            setRefineInput("");
            await sendMessage({ text: t });
          }}
        >
          {atCap ? (
            mode === "create" ? (
              <div className="py-2 space-y-2 text-center">
                <p className="text-xs font-medium text-foreground">Brainstorm session complete.</p>
                <p className="text-[11px] text-muted-foreground">You've had enough ideas. Time to pick one and do something with it.</p>
                <div className="flex justify-center gap-2 pt-1">
                  <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setMode("validate")}>
                    <Target className="size-3.5" />
                    Validate an idea
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={onNewThread}>
                    New session
                  </Button>
                </div>
              </div>
            ) : (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Message limit reached for this session. Start a new thread to continue.
              </p>
            )
          ) : (
            <div className="flex gap-2">
              <Textarea
                rows={4}
                className="min-h-[100px] flex-1 resize-y border-border/60 bg-background/50 text-sm"
                placeholder={
                  mode === "create" && selectedDiscoveryIdea
                    ? "Ask about this idea: target user, how to validate cheaply, first steps, whether to pursue it…"
                    : chatMeta.placeholder
                }
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
          )}
          {!atCap && (
            <p className="mt-1.5 text-right text-[10px] text-muted-foreground/40">
              {effectiveCap - userMessageCount} messages remaining
            </p>
          )}
        </form>
      </div>

    </div>
  );
}

const ANALYSIS_STEPS = [
  "Fetching Reddit signals…",
  "Searching Hacker News…",
  "Scanning GitHub issues…",
  "Clustering pain points…",
  "Scoring market opportunity…",
  "Building your report…",
];

function AnalysisLoading() {
  const [progress, setProgress] = useState(2);
  const [stepIdx, setStepIdx] = useState(0);
  const steps = ANALYSIS_STEPS;

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

function FitDot({ score }: { score?: number }) {
  const v = score ?? 0;
  const color = v >= 8 ? "bg-emerald-500" : v >= 6 ? "bg-amber-500" : "bg-red-500/70";
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className={`inline-block size-1.5 rounded-full ${color}`} />
      {v}
    </span>
  );
}

function DiscoverResults({
  data,
  streaming,
  onValidate,
  onSelect,
  selectedTitle,
  hasProfile,
}: {
  data: DeepPartial<IdeaDiscovery> | undefined;
  streaming: boolean;
  onValidate: (idea: DiscoveryIdea) => void;
  onSelect: (idea: DiscoveryIdea) => void;
  selectedTitle?: string;
  hasProfile: boolean;
}) {
  const zones = data?.opportunityZones ?? [];
  const summary = data?.founderSummary;

  if (!streaming && zones.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <Sparkles className="size-10 opacity-30" />
        <p className="font-medium text-foreground">Your Opportunity Map</p>
        <p className="max-w-xs">
          {hasProfile
            ? "Describe a niche or market above, then click Generate. We'll map the startup opportunities you're best positioned to execute."
            : "Describe your background and interests above. The engine will surface opportunities matched to your unfair advantages."}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-12 space-y-5">

        {/* Founder profile summary */}
        {summary && (summary.role || (summary.skills?.length ?? 0) > 0) && (
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Your profile
            </p>
            <div className="flex flex-wrap gap-1.5">
              {summary.role && (
                <span className="rounded-full border border-border/50 bg-background/60 px-2 py-0.5 text-[11px] text-foreground/80">
                  {summary.role}
                </span>
              )}
              {summary.skills?.map((s, i) => s && (
                <span key={i} className="rounded-full border border-border/50 bg-background/60 px-2 py-0.5 text-[11px] text-foreground/80">
                  {s}
                </span>
              ))}
              {summary.interests?.map((s, i) => s && (
                <span key={i} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] text-primary/80">
                  {s}
                </span>
              ))}
            </div>
            {summary.keyAdvantages && summary.keyAdvantages.length > 0 && (
              <ul className="space-y-0.5">
                {summary.keyAdvantages.map((a, i) => a && (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-primary/40" />
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Opportunity zones */}
        {streaming && zones.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60 px-1">
            <Loader2 className="size-3 animate-spin" />
            Mapping your opportunity landscape…
          </div>
        )}

        {zones.map((zone, zi) => zone && (
          <div key={zi} className="space-y-2">
            {/* Zone header */}
            <div className="space-y-0.5 px-1">
              <p className="text-sm font-semibold text-foreground">{zone.zone ?? "…"}</p>
              {zone.zoneRationale && (
                <p className="text-xs text-muted-foreground leading-relaxed">{zone.zoneRationale}</p>
              )}
            </div>

            {/* Ideas in zone */}
            <div className="grid gap-2 sm:grid-cols-2">
              {zone.ideas?.map((idea, ii) => {
                if (!idea) return null;
                const isSelected = !!idea.title && idea.title === selectedTitle;
                const fit = idea.founderFitScore;
                return (
                  <div
                    key={ii}
                    className={`flex flex-col gap-2 rounded-xl border p-3.5 transition-colors ${
                      isSelected
                        ? "border-primary/50 bg-primary/[0.06]"
                        : "border-border/60 bg-background/50"
                    }`}
                  >
                    {/* Title + score */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug">{idea.title ?? "…"}</p>
                      {typeof idea.opportunityScore === "number" && (
                        <Badge className={`shrink-0 text-[10px] ${
                          idea.opportunityScore >= 70 ? "bg-emerald-600/25 text-emerald-200" :
                          idea.opportunityScore >= 45 ? "bg-amber-600/25 text-amber-200" :
                                                        "bg-muted text-muted-foreground"
                        }`}>
                          {idea.opportunityScore}
                        </Badge>
                      )}
                    </div>

                    {idea.oneLiner && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{idea.oneLiner}</p>
                    )}

                    {/* Why you / why now */}
                    {idea.whyYou && (
                      <p className="text-[11px] text-foreground/75 leading-relaxed">
                        <span className="text-muted-foreground/60">Why you: </span>{idea.whyYou}
                      </p>
                    )}
                    {idea.whyNow && (
                      <p className="text-[11px] text-foreground/75 leading-relaxed">
                        <span className="text-muted-foreground/60">Why now: </span>{idea.whyNow}
                      </p>
                    )}

                    {/* Monetization */}
                    {idea.monetizationPath && (
                      <p className="rounded-md bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
                        💰 {idea.monetizationPath}
                      </p>
                    )}

                    {/* Founder fit scores */}
                    {fit && (fit.skillMatch || fit.distributionAdvantage || fit.executionSpeed || fit.monetizationFit) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border/30 pt-2">
                        <span className="text-[10px] text-muted-foreground/50 w-full">Founder fit</span>
                        <FitDot score={fit.skillMatch} />
                        <span className="text-[10px] text-muted-foreground/40">skill</span>
                        <FitDot score={fit.distributionAdvantage} />
                        <span className="text-[10px] text-muted-foreground/40">dist</span>
                        <FitDot score={fit.executionSpeed} />
                        <span className="text-[10px] text-muted-foreground/40">speed</span>
                        <FitDot score={fit.monetizationFit} />
                        <span className="text-[10px] text-muted-foreground/40">monet</span>
                      </div>
                    )}

                    {/* Tags */}
                    {(idea.tags?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {idea.tags!.map((tag, j) => tag && (
                          <Badge key={j} variant="secondary" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {idea.title && idea.oneLiner && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <Button
                          type="button" size="sm"
                          variant={isSelected ? "default" : "ghost"}
                          className="gap-1.5 text-xs h-7"
                          onClick={() => onSelect(idea as DiscoveryIdea)}
                        >
                          <MessageSquare className="size-3" />
                          {isSelected ? "Discussing" : "Discuss"}
                        </Button>
                        <Button
                          type="button" size="sm" variant="outline"
                          className="gap-1.5 text-xs h-7"
                          onClick={() => onValidate(idea as DiscoveryIdea)}
                        >
                          Validate
                          <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      </div>
    </ScrollArea>
  );
}
