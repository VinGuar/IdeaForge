"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { DeepPartial } from "ai";
import type { IdeaReport } from "@/lib/schemas/idea-report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ClipboardCopy,
  ExternalLink,
  Gauge,
  Loader2,
} from "lucide-react";


const SCORE_HOW: Record<string, string> = {
  "Monetization potential": "Goes up when we find real people already paying money for something similar, or building DIY workarounds because they can't afford existing options. Goes down when there's no evidence anyone would open their wallet.",
  "Ease of acquisition": "Goes up when there are obvious places to find customers, like active communities, forums, or word-of-mouth networks. Goes down when customers are hard to reach or need a lot of convincing.",
  "Competition intensity": "Goes up (worse) when big, well-funded companies already own the market. Goes down (better) when competition is weak, overpriced, or missing key features your users need.",
  "AI defensibility": "Goes up when AI can do something for your product that would take competitors a long time to copy. Goes down when AI is just a thin layer that anyone could add in a week.",
  "MVP feasibility": "Goes up when the core product can be built quickly and cheaply by one person. Goes down when it requires complex integrations, large datasets, or a full team to build.",
  "Speed to revenue": "Goes up when customers would pay on day one and the sales cycle is short. Goes down when you'd need months of free trials, enterprise contracts, or regulatory approvals before seeing money.",
  "Solo-founder viability": "Goes up when one person with the right skills can realistically build, launch, and grow this. Goes down when it requires a team, heavy capital, or skills that are hard to combine in one person.",
};

function ScoreRow({ label, value, invert, explanation }: {
  label: string;
  value?: number;
  invert?: boolean;
  explanation?: string;
}) {
  const [open, setOpen] = useState(false);
  const v = typeof value === "number" ? Math.min(100, Math.max(0, value)) : 0;
  const good = invert ? v < 40 : v >= 65;
  const mid = invert ? v < 65 : v >= 40;
  const color = good ? "bg-emerald-500" : mid ? "bg-amber-500" : "bg-red-500";
  const textColor = good ? "text-emerald-400" : mid ? "text-amber-400" : "text-red-400";
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-xs hover:opacity-80 transition-opacity"
      >
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`tabular-nums font-semibold ${textColor}`}>{v}</span>
          <ChevronDown className={`size-3 text-muted-foreground/50 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${v}%` }} />
      </div>
      {open && (
        <div className="rounded-md border border-border/50 bg-muted/30 px-2.5 py-2.5 text-[11px] space-y-2.5">
          {SCORE_HOW[label] && (
            <div>
              <p className="font-semibold text-foreground/80 uppercase tracking-wide text-[10px] mb-0.5">How this is scored</p>
              <p className="text-muted-foreground">{SCORE_HOW[label]}</p>
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground/80 uppercase tracking-wide text-[10px] mb-0.5">Why this idea scored {v}</p>
            <p className="text-muted-foreground">{explanation ?? "Generating explanation…"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}


const TAB_INFO: Record<string, { title: string; body: string }> = {
  signals: {
    title: "Raw evidence from the internet",
    body: "Real posts and comments pulled from Reddit, Hacker News, GitHub, and Stack Overflow. Everything in the other tabs is built from this data. If signals look thin or off-topic, try re-running with a more specific idea.",
  },
  market: {
    title: "How big is this opportunity?",
    body: "The size of the market, who your competitors are, and whether there is room for something new. Use this to decide if the opportunity is worth pursuing before spending time on it.",
  },
  execution: {
    title: "Where is your angle of attack?",
    body: "The specific gaps in the market you can exploit, where existing products are failing, and how likely this idea is to succeed across seven key dimensions. This is the most actionable section.",
  },
};

export function ReportPanel({
  partial,
  streaming,
}: {
  partial: DeepPartial<IdeaReport> | undefined;
  streaming: boolean;
}) {
  const [activeTab, setActiveTab] = useState("signals");
  if (!partial && !streaming) {
    return (
      <div className="flex h-full flex-col justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <Gauge className="mx-auto size-10 opacity-40" />
        <p className="font-medium text-foreground">No report yet</p>
        <p>
          Run the demand engine on the left. Reddit + HN snippets ground the
          synthesis. Widen your topic if ingestion looks thin.
        </p>
      </div>
    );
  }

  const gate = partial?.validationQuality;
  const scores = partial?.probabilityScores;

  return (
    <div className="glass-panel flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">
            {partial?.title || (streaming ? "Synthesizing…" : "Idea report")}
          </p>
          {partial?.oneLiner ? (
            <p className="truncate text-xs text-muted-foreground">
              {partial.oneLiner}
            </p>
          ) : null}
        </div>
        {streaming && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      {partial?.dataRetrievalNote && (
        <p className="mx-4 mt-3 text-[11px] text-muted-foreground/70 leading-relaxed">
          {partial.dataRetrievalNote}
        </p>
      )}

      {gate ? (
        <BuildGateBadge score={gate.buildGateScore} reasons={gate.reasons} />
      ) : null}

      <Tabs defaultValue="signals" className="flex min-h-0 flex-1 flex-col gap-0" onValueChange={setActiveTab}>
        <TabsList className="mx-4 mt-3 grid h-9 w-auto grid-cols-3 rounded-xl bg-muted/70 p-1">
          <TabsTrigger value="signals" className="text-[10px] px-1">Signals</TabsTrigger>
          <TabsTrigger value="market" className="text-[10px] px-1">Market</TabsTrigger>
          <TabsTrigger value="execution" className="text-[10px] px-1">Wedge</TabsTrigger>
        </TabsList>

        {/* Tab description strip - seamlessly connected to tabs above */}
        <div className="border-b border-border/50 bg-muted/30 px-4 py-2.5">
          <p className="text-[11px] font-medium text-foreground/90">{TAB_INFO[activeTab]?.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{TAB_INFO[activeTab]?.body}</p>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-4 pb-10">
            <TabsContent value="signals" className="mt-0 space-y-4">
              <SectionTitle>Pain clusters</SectionTitle>
              <p className="text-[11px] font-medium text-foreground/80">Groups of similar complaints that kept showing up across multiple posts. Each cluster is a real, recurring problem. The more complaints in a cluster, the stronger the signal that people genuinely struggle with this.</p>
              {(partial?.painClusters?.length ?? 0) === 0 ? (
                <EmptyLine streaming={streaming} />
              ) : (
                partial?.painClusters?.map((c, i) => (
                  <Card key={i} className="border-border/80 bg-background/55 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{c?.theme}</CardTitle>
                      <p className="text-[11px] text-muted-foreground/60 italic mt-0.5">What this could mean for your idea</p>
                      <CardDescription className="text-xs mt-0.5">
                        {c?.opportunityHypothesis}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs text-muted-foreground">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50 mb-1.5">Real complaints found online</p>
                      {c?.evidenceSnippets?.map((ex, j) => (
                        <p key={j} className="rounded-md bg-muted/40 p-2">
                          "{ex}"
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}

              <Separator />

              <SectionTitle>Demand snippets</SectionTitle>
              <p className="text-[11px] font-medium text-foreground/80">The actual posts and comments pulled from the internet. These are the raw source data. Click any link to read the original post yourself. <span className="text-violet-400">Purple badge</span> means someone mentioned paying money, which is the strongest signal that real demand exists.</p>
              {(partial?.demandSignalsSummary?.length ?? 0) === 0 ? (
                <EmptyLine streaming={streaming} />
              ) : (
                <div className="space-y-2">
                  {partial?.demandSignalsSummary?.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border/70 bg-background/55 p-3 text-xs shadow-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-normal capitalize">
                          Found on {s?.source}
                        </Badge>
                        {s?.wtpSignal ? (
                          <Badge className="bg-violet-600/90 font-normal">
                            💰 Mentions paying
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="font-normal">
                          {s?.frustration === "high" ? "😤 Very frustrated" : s?.frustration === "medium" ? "😐 Somewhat frustrated" : "😕 Mildly frustrated"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-muted-foreground">"{s?.excerpt}"</p>
                      {s?.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-1 truncate text-[11px] text-primary/80 hover:text-primary transition-colors"
                        >
                          <ExternalLink className="size-3 shrink-0" />
                          View original post
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="market" className="mt-0 space-y-4">
              <MiniBlock
                title="Problem"
                subtitle="What pain this solves, who feels it most, and how often they run into it. Based on patterns found across all the snippets."
                streaming={streaming}
                body={
                  partial?.problemAnalysis ? (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p>{partial.problemAnalysis.customerPain}</p>
                      <p>
                        <span className="text-foreground">Who: </span>
                        {partial.problemAnalysis.whoExperiences}
                      </p>
                      <p>
                        <span className="text-foreground">Frequency: </span>
                        {partial.problemAnalysis.frequency}
                      </p>
                      <p>
                        <span className="text-foreground">Urgency: </span>
                        {partial.problemAnalysis.urgency}
                      </p>
                      <ul className="list-inside list-disc space-y-1">
                        {partial.problemAnalysis.currentAlternatives?.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  ) : undefined
                }
              />

              <MiniBlock
                title="Market reality"
                subtitle="How big this market is and whether it is growing. TAM = total market size. SAM = the slice you can realistically reach. SOM = what you could capture in year one."
                streaming={streaming}
                body={
                  partial?.marketReality ? (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p>{partial.marketReality.tamSamSom}</p>
                      <p>{partial.marketReality.searchDemand}</p>
                      <p>{partial.marketReality.trendMomentum}</p>
                      <p className="text-amber-200/90">{partial.marketReality.oversaturationWarning}</p>
                      <p>{partial.marketReality.competitorDensity}</p>
                    </div>
                  ) : undefined
                }
              />

              <SectionTitle>Competitors</SectionTitle>
              <p className="text-[11px] font-medium text-foreground/80">Products people are already using to solve this problem. Their weaknesses are your opportunities. Click the link icon next to any name to visit and verify the product is real.</p>
              {(partial?.competitors?.length ?? 0) === 0 ? (
                <EmptyLine streaming={streaming} />
              ) : (
                partial?.competitors?.map((c, i) => (
                  <Card key={i} className="border-border/80 bg-background/55 shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CardTitle className="text-sm">{c?.name}</CardTitle>
                          {c?.url && (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-primary/70 hover:text-primary transition-colors"
                              title={`Visit ${c.name}`}
                            >
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                        <Badge variant="outline">{c?.pricing}</Badge>
                      </div>
                      <CardDescription className="text-xs">
                        Sentiment: {c?.sentiment}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-xs md:grid-cols-2">
                      <div>
                        <p className="mb-1 font-medium text-foreground">
                          Strengths
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                          {c?.strengths?.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-1 font-medium text-foreground">
                          Weaknesses
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                          {c?.weaknesses?.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="md:col-span-2">
                        <p className="mb-1 font-medium text-foreground">
                          Complaints
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                          {c?.commonComplaints?.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="execution" className="mt-0 space-y-4">
              <MiniBlock
                title="Opportunity wedge"
                subtitle="The specific gaps in the market you can exploit. Each field shows a different angle where existing products are failing and where you could do better."
                streaming={streaming}
                body={
                  partial?.opportunityWedge ? (
                    <dl className="grid gap-3 text-xs text-muted-foreground">
                      <WedgeField label="Underserved audience" hint="The specific group of people who need this most but are being ignored by existing products." value={partial.opportunityWedge.underservedAudience} />
                      <WedgeField label="Ignored workflow" hint="The painful manual step or broken process that no one has fixed yet." value={partial.opportunityWedge.ignoredWorkflow} />
                      <WedgeField label="Pricing gap" hint="Where existing solutions are too expensive or too cheap, creating room for a better-priced option." value={partial.opportunityWedge.pricingGap} />
                      <WedgeField label="UX gap" hint="Where existing tools are confusing, ugly, or frustrating. This is where you can do better." value={partial.opportunityWedge.uxGap} />
                      <WedgeField label="AI leverage" hint="Where AI can do something faster or cheaper than competitors that is hard for them to copy quickly." value={partial.opportunityWedge.aiLeverage} />
                      <WedgeField label="Speed advantage" hint="Why you can ship a working version faster than an established company would." value={partial.opportunityWedge.speedAdvantage} />
                    </dl>
                  ) : undefined
                }
              />

              <MiniBlock
                title="Founder fit"
                subtitle="How well-suited you are to build this based on what you shared about yourself. The best idea for someone else may not be the best idea for you."
                streaming={streaming}
                body={
                  partial?.founderFit ? (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p>{partial.founderFit.skillsMatch}</p>
                      <p>
                        Difficulty:{" "}
                        <span className="text-foreground">
                          {partial.founderFit.difficulty}
                        </span>
                      </p>
                      <p>{partial.founderFit.buildTimeline}</p>
                      <p>{partial.founderFit.technicalComplexity}</p>
                    </div>
                  ) : undefined
                }
              />

              <SectionTitle>Probability scores</SectionTitle>
              <p className="text-[11px] font-medium text-foreground/80">Seven scores that measure how likely this idea is to succeed across the dimensions that matter most. Click any score to see exactly how it works and why this idea got that number.</p>
              {scores ? (
                <div className="grid gap-3 rounded-xl border border-border/70 bg-background/55 p-3 shadow-sm">
                  <ScoreRow label="Monetization potential" value={scores.monetizationPotential} explanation={partial?.probabilityScoreExplanations?.monetizationPotential} />
                  <ScoreRow label="Ease of acquisition" value={scores.easeOfAcquisition} explanation={partial?.probabilityScoreExplanations?.easeOfAcquisition} />
                  <ScoreRow label="Competition intensity" value={scores.competitionIntensity} invert explanation={partial?.probabilityScoreExplanations?.competitionIntensity} />
                  <ScoreRow label="AI defensibility" value={scores.aiDefensibility} explanation={partial?.probabilityScoreExplanations?.aiDefensibility} />
                  <ScoreRow label="MVP feasibility" value={scores.mvpFeasibility} explanation={partial?.probabilityScoreExplanations?.mvpFeasibility} />
                  <ScoreRow label="Speed to revenue" value={scores.speedToRevenue} explanation={partial?.probabilityScoreExplanations?.speedToRevenue} />
                  <ScoreRow label="Solo-founder viability" value={scores.soloFounderViability} explanation={partial?.probabilityScoreExplanations?.soloFounderViability} />
                </div>
              ) : (
                <EmptyLine streaming={streaming} />
              )}
            </TabsContent>

          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function BuildGateBadge({ score, reasons }: { score?: number; reasons?: (string | undefined)[] }) {
  const s = typeof score === "number" ? Math.min(100, Math.max(0, score)) : 0;
  const isGreen = s >= 65;
  const isYellow = s >= 40 && s < 65;
  const label = isGreen ? "Strong signals. Validate before building." : isYellow ? "Mixed signals. More validation needed." : "Weak signals. Do not build yet.";
  const colors = isGreen
    ? { border: "border-emerald-500/35", bg: "bg-emerald-500/10", score: "text-emerald-400", bar: "bg-emerald-500" }
    : isYellow
      ? { border: "border-amber-500/35", bg: "bg-amber-500/10", score: "text-amber-400", bar: "bg-amber-500" }
      : { border: "border-red-500/35", bg: "bg-red-500/10", score: "text-red-400", bar: "bg-red-500" };
  return (
    <div className={`mx-4 mt-3 rounded-lg border px-3 py-2.5 text-xs ${colors.border} ${colors.bg}`}>
      <div className="flex items-center gap-3">
        <span className={`text-3xl font-bold tabular-nums leading-none ${colors.score}`}>{s}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Build gate score</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/20">
        <div className={`h-full rounded-full transition-all ${colors.bar}`} style={{ width: `${s}%` }} />
      </div>
      {reasons && reasons.length > 0 ? (
        <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-muted-foreground">
          {reasons.slice(0, 6).map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function WedgeField({ label, hint, value }: { label: string; hint: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-medium text-foreground">{label}</dt>
      <dd className="mt-0.5 text-[11px] text-muted-foreground/60 italic">{hint}</dd>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function EmptyLine({ streaming }: { streaming: boolean }) {
  return (
    <p className="text-xs text-muted-foreground">
      {streaming ? "Streaming…" : "Not filled yet."}
    </p>
  );
}

function MiniBlock({
  title,
  subtitle,
  body,
  streaming,
}: {
  title: string;
  subtitle?: string;
  body?: ReactNode;
  streaming: boolean;
}) {
  return (
    <Card className="border-border/80 bg-background/55 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {subtitle && <p className="text-[11px] font-medium text-foreground/70 mt-0.5">{subtitle}</p>}
      </CardHeader>
      <CardContent>{body ?? <EmptyLine streaming={streaming} />}</CardContent>
    </Card>
  );
}

function CopyCard({ title, text }: { title: string; text?: string }) {
  if (!text) return null;
  return (
    <Card className="border-border/80 bg-background/55 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs">{title}</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={() => copy(text)}
        >
          <ClipboardCopy className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
          {text}
        </pre>
      </CardContent>
    </Card>
  );
}
