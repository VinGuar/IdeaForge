"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { DeepPartial } from "ai";
import type { IdeaFinisher } from "@/lib/schemas/idea-finisher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  Rocket,
  Crosshair,
  Users,
  Zap,
  Hammer,
  Compass,
  DollarSign,
  Megaphone,
  ListOrdered,
  ShieldAlert,
  TriangleAlert,
  CheckCircle2,
  Circle,
  X,
} from "lucide-react";

// ── Shared helpers ────────────────────────────────────────────────────────────

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
}

function CopyBlock({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => copy(text)}>
          <ClipboardCopy className="size-3.5" />
        </Button>
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
        {text}
      </pre>
    </div>
  );
}

function Collapsible({ title, badge, defaultOpen = false, children }: {
  title: string; badge?: ReactNode; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/70 bg-background/55 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{title}</span>
          {badge}
        </div>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-border/50 px-3 py-3">{children}</div>}
    </div>
  );
}

function SLabel({ children }: { children: string }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
      {children}
    </h3>
  );
}

function Empty({ streaming }: { streaming: boolean }) {
  return <p className="text-xs text-muted-foreground">{streaming ? "Generating…" : "Nothing yet."}</p>;
}

// ── Blueprint card ────────────────────────────────────────────────────────────

function Card({
  icon: Icon,
  title,
  accent = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${
      accent ? "border-primary/30 bg-primary/[0.06]" : "border-border/60 bg-card/50"
    }`}>
      <div className="flex items-center gap-2">
        <Icon className={`size-3.5 shrink-0 ${accent ? "text-primary" : "text-muted-foreground/70"}`} />
        <h3 className={`text-[11px] font-bold uppercase tracking-widest ${accent ? "text-primary" : "text-muted-foreground/60"}`}>
          {title}
        </h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50">{label}</p>
      <p className="text-sm text-foreground/85 leading-relaxed">{value}</p>
    </div>
  );
}

function Bullets({ items, variant = "default" }: {
  items?: (string | undefined | null)[];
  variant?: "default" | "check" | "cross" | "numbered";
}) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => {
        if (!item) return null;
        const prefix =
          variant === "check"    ? <CheckCircle2 className="size-3.5 shrink-0 mt-0.5 text-emerald-400" /> :
          variant === "cross"    ? <X className="size-3.5 shrink-0 mt-0.5 text-red-400/70" /> :
          variant === "numbered" ? <span className="text-muted-foreground/50 shrink-0 tabular-nums text-[11px] min-w-[1rem]">{i + 1}.</span> :
                                   <Circle className="size-1.5 shrink-0 mt-1.5 fill-muted-foreground/40 text-transparent" />;
        return (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
            {prefix}
            <span>{item}</span>
          </li>
        );
      })}
    </ul>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FinisherBlueprint({
  blueprint,
  generating,
  onGenerate,
  onRegenerate,
  canGenerate,
  ideaTitle,
}: {
  blueprint: DeepPartial<IdeaFinisher> | undefined;
  generating: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  canGenerate: boolean;
  ideaTitle?: string;
}) {
  if (!blueprint && !generating) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Rocket className="size-7 text-primary/60" />
        </div>
        <div className="max-w-xs space-y-2">
          <p className="font-semibold text-foreground text-base">Turn validated ideas into real, buildable startups.</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Generate a complete startup blueprint: positioning, MVP, market research, competitor analysis, GTM plan, monetization, build artifacts, and launch copy.
          </p>
        </div>
        {canGenerate ? (
          <Button onClick={onGenerate} className="gap-2 shadow-md shadow-primary/20">
            <Rocket className="size-4" />
            Generate Blueprint
            {ideaTitle && (
              <span className="opacity-60 font-normal">
                for "{ideaTitle.slice(0, 28)}{ideaTitle.length > 28 ? "…" : ""}"
              </span>
            )}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Validate an idea first to generate a blueprint from it.</p>
        )}
      </div>
    );
  }

  if (generating && !blueprint) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Loader2 className="size-8 animate-spin text-primary/60" />
        <div>
          <p className="font-medium text-foreground">Building your complete startup plan…</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Researching market signals, analyzing competitors, defining MVP, generating launch copy…
          </p>
        </div>
      </div>
    );
  }

  const b = blueprint!;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Regenerate strip */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-4 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
          {generating && <Loader2 className="size-3 animate-spin" />}
          {generating ? "Generating blueprint…" : "Startup Blueprint"}
        </p>
        {!generating && (
          <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground h-7" onClick={onRegenerate}>
            Regenerate
          </Button>
        )}
      </div>

      <Tabs defaultValue="blueprint" className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList className="mx-4 mt-3 mb-0 grid h-9 w-auto shrink-0 grid-cols-4 rounded-xl bg-muted/70 p-1 shrink-0">
          <TabsTrigger value="blueprint" className="text-[10px] px-1">Blueprint</TabsTrigger>
          <TabsTrigger value="evidence"  className="text-[10px] px-1">Evidence</TabsTrigger>
          <TabsTrigger value="market"    className="text-[10px] px-1">Market</TabsTrigger>
          <TabsTrigger value="build"     className="text-[10px] px-1">Build</TabsTrigger>
        </TabsList>

        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4 pb-12 space-y-3">

            {/* ── BLUEPRINT TAB ────────────────────────────────────────── */}
            <TabsContent value="blueprint" className="mt-0 space-y-3">

              {b.positioning && (
                <Card icon={Crosshair} title="Positioning" accent>
                  <p className="text-sm text-foreground/85 leading-relaxed">{b.positioning}</p>
                </Card>
              )}

              {b.targetUser && (
                <Card icon={Users} title="Target User">
                  <Row label="Primary user" value={b.targetUser.primary} />
                  <Row label="Secondary user" value={b.targetUser.secondary} />
                  <Row label="Pain context" value={b.targetUser.painContext} />
                  <Row label="Why existing tools fail" value={b.targetUser.whyExistingFail} />
                </Card>
              )}

              {b.coreProblem && (
                <Card icon={Zap} title="Core Problem">
                  <p className="text-sm text-foreground/85 leading-relaxed">{b.coreProblem}</p>
                </Card>
              )}

              {b.mvp && (
                <Card icon={Hammer} title="MVP Definition" accent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/50">In scope</p>
                      <Bullets items={b.mvp.features} variant="check" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/50">Out of scope</p>
                      <Bullets items={b.mvp.excluded} variant="cross" />
                    </div>
                  </div>
                  {(b.mvp.platform || b.mvp.behavior) && (
                    <div className="flex flex-wrap gap-4 border-t border-border/30 pt-3 mt-1">
                      {b.mvp.platform && <Row label="Platform" value={b.mvp.platform} />}
                      {b.mvp.behavior && <Row label="Behavior" value={b.mvp.behavior} />}
                    </div>
                  )}
                </Card>
              )}

              {b.wedgeStrategy && (
                <Card icon={Compass} title="Wedge Strategy">
                  {b.wedgeStrategy.summary && (
                    <p className="text-sm text-foreground/85 leading-relaxed">{b.wedgeStrategy.summary}</p>
                  )}
                  <Bullets items={b.wedgeStrategy.channels} />
                </Card>
              )}

              {b.monetization && (
                <Card icon={DollarSign} title="Monetization">
                  <div className="flex items-start gap-3">
                    {b.monetization.model && (
                      <span className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {b.monetization.model}
                      </span>
                    )}
                    <div className="space-y-1 min-w-0">
                      {b.monetization.pricingIdea && (
                        <p className="text-sm font-medium text-foreground">{b.monetization.pricingIdea}</p>
                      )}
                      {b.monetization.rationale && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{b.monetization.rationale}</p>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {(b.gtmSteps?.length ?? 0) > 0 && (
                <Card icon={Megaphone} title="Go-To-Market">
                  <Bullets items={b.gtmSteps} variant="numbered" />
                </Card>
              )}

              {(b.buildOrder?.length ?? 0) > 0 && (
                <Card icon={ListOrdered} title="Build Order">
                  <Bullets items={b.buildOrder} variant="numbered" />
                </Card>
              )}

              {(b.executionRisks?.length ?? 0) > 0 && (
                <Card icon={ShieldAlert} title="Execution Risks">
                  <div className="space-y-3">
                    {b.executionRisks!.map((r, i) => {
                      if (!r) return null;
                      return (
                        <div key={i} className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <TriangleAlert className="size-3 shrink-0 text-amber-400/80" />
                            <p className="text-xs font-semibold text-foreground/90">{r.risk}</p>
                          </div>
                          {r.mitigation && (
                            <p className="text-xs text-muted-foreground leading-relaxed pl-5">{r.mitigation}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* ── EVIDENCE TAB ─────────────────────────────────────────── */}
            <TabsContent value="evidence" className="mt-0 space-y-4">
              <SLabel>Pain clusters</SLabel>
              <p className="text-[11px] text-muted-foreground">Groups of similar complaints that kept appearing. Each cluster is a real product opportunity.</p>
              {(b.painClusters?.length ?? 0) === 0 ? <Empty streaming={generating} /> : (
                <div className="space-y-2">
                  {b.painClusters!.map((c, i) => (
                    <Collapsible key={i} title={c?.theme ?? "…"} defaultOpen={i === 0}>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{c?.opportunityHypothesis}</p>
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50">Real complaints</p>
                          {c?.evidenceSnippets?.map((ex, j) => (
                            <p key={j} className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">"{ex}"</p>
                          ))}
                        </div>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}

              <SLabel>Demand snippets</SLabel>
              <p className="text-[11px] text-muted-foreground"><span className="text-violet-400">Purple</span> = someone mentioned paying. Click any link to see the original post.</p>
              {(b.demandSignalsSummary?.length ?? 0) === 0 ? <Empty streaming={generating} /> : (
                <div className="space-y-2">
                  {b.demandSignalsSummary!.map((s, i) => (
                    <div key={i} className="rounded-xl border border-border/70 bg-background/55 p-3 text-xs space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="font-normal capitalize text-[10px]">{s?.source}</Badge>
                        {s?.wtpSignal && (
                          <Badge className="bg-violet-600/90 font-normal text-[10px]">💰 Mentions paying</Badge>
                        )}
                        <Badge variant="outline" className="font-normal text-[10px]">
                          {s?.frustration === "high" ? "😤 Very frustrated" : s?.frustration === "medium" ? "😐 Somewhat frustrated" : "😕 Mildly frustrated"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">"{s?.excerpt}"</p>
                      {s?.url && (
                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 truncate text-[11px] text-primary/80 hover:text-primary transition-colors">
                          <ExternalLink className="size-3 shrink-0" />
                          View original post
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── MARKET TAB ───────────────────────────────────────────── */}
            <TabsContent value="market" className="mt-0 space-y-4">

              {b.problemAnalysis && (
                <Collapsible title="The problem" defaultOpen>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>{b.problemAnalysis.customerPain}</p>
                    <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/30 p-2">
                      <div><p className="font-medium text-foreground text-[11px]">Who</p><p>{b.problemAnalysis.whoExperiences}</p></div>
                      <div><p className="font-medium text-foreground text-[11px]">Urgency</p><p className="capitalize">{b.problemAnalysis.urgency}</p></div>
                      <div className="col-span-2"><p className="font-medium text-foreground text-[11px]">Frequency</p><p>{b.problemAnalysis.frequency}</p></div>
                    </div>
                    {(b.problemAnalysis.currentAlternatives?.length ?? 0) > 0 && (
                      <div>
                        <p className="font-medium text-foreground text-[11px] mb-1">Current alternatives</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {b.problemAnalysis.currentAlternatives?.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </Collapsible>
              )}

              {b.marketReality && (
                <Collapsible title="Market size & trends" defaultOpen>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>{b.marketReality.tamSamSom}</p>
                    <p>{b.marketReality.searchDemand}</p>
                    <p>{b.marketReality.trendMomentum}</p>
                    {b.marketReality.oversaturationWarning && (
                      <p className="rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-1.5 text-amber-200/90">
                        ⚠ {b.marketReality.oversaturationWarning}
                      </p>
                    )}
                    <p>{b.marketReality.competitorDensity}</p>
                  </div>
                </Collapsible>
              )}

              <SLabel>Competitors</SLabel>
              <p className="text-[11px] text-muted-foreground">Their weaknesses are your wedge opportunities.</p>
              {(b.competitors?.length ?? 0) === 0 ? <Empty streaming={generating} /> : (
                <div className="space-y-2">
                  {b.competitors!.map((c, i) => (
                    <Collapsible key={i}
                      title={c?.name ?? "…"}
                      badge={c?.pricing ? <Badge variant="outline" className="text-[10px] font-normal">{c.pricing}</Badge> : undefined}>
                      <div className="space-y-3 text-xs">
                        {c?.url && (
                          <a href={c.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary transition-colors">
                            <ExternalLink className="size-3" /> Visit site
                          </a>
                        )}
                        {c?.sentiment && <p className="text-muted-foreground">{c.sentiment}</p>}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="font-medium text-foreground mb-1">Strengths</p>
                            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                              {c?.strengths?.map((s, j) => <li key={j}>{s}</li>)}
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium text-foreground mb-1">Weaknesses</p>
                            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                              {c?.weaknesses?.map((s, j) => <li key={j}>{s}</li>)}
                            </ul>
                          </div>
                        </div>
                        {(c?.commonComplaints?.length ?? 0) > 0 && (
                          <div>
                            <p className="font-medium text-foreground mb-1">User complaints</p>
                            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                              {c!.commonComplaints!.map((s, j) => <li key={j}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── BUILD TAB ────────────────────────────────────────────── */}
            <TabsContent value="build" className="mt-0 space-y-4">

              {b.opportunityWedge && (
                <Collapsible title="Your angle of attack" defaultOpen>
                  <dl className="space-y-3 text-xs text-muted-foreground">
                    {([
                      { k: "underservedAudience", label: "Underserved audience" },
                      { k: "ignoredWorkflow",     label: "Ignored workflow"     },
                      { k: "pricingGap",          label: "Pricing gap"          },
                      { k: "uxGap",               label: "UX gap"               },
                      { k: "aiLeverage",          label: "AI leverage"          },
                      { k: "speedAdvantage",      label: "Speed advantage"      },
                    ] as const).map(({ k, label }) => {
                      const val = (b.opportunityWedge as Record<string, string | undefined> | undefined)?.[k];
                      if (!val) return null;
                      return (
                        <div key={k}>
                          <dt className="font-medium text-foreground">{label}</dt>
                          <dd className="mt-0.5">{val}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </Collapsible>
              )}

              {b.founderFit && (
                <Collapsible title="Founder fit">
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>{b.founderFit.skillsMatch}</p>
                    <p>{b.founderFit.buildTimeline}</p>
                    <p>{b.founderFit.technicalComplexity}</p>
                    <p>Difficulty: <span className="text-foreground capitalize">{b.founderFit.difficulty}</span></p>
                  </div>
                </Collapsible>
              )}

              {b.buildArtifacts && (
                <Collapsible title="Build prompts & architecture">
                  <div className="space-y-4">
                    <CopyBlock label="Lovable prompt" text={b.buildArtifacts.lovablePrompt} />
                    <CopyBlock label="v0 prompt"      text={b.buildArtifacts.v0Prompt} />
                    <CopyBlock label="Cursor prompt"  text={b.buildArtifacts.cursorPrompt} />
                    <CopyBlock label="DB schema"      text={b.buildArtifacts.dbSchema} />
                    <CopyBlock label="Architecture"   text={b.buildArtifacts.architecture} />
                    <CopyBlock label="Auth & payments" text={b.buildArtifacts.authPayments} />
                    <CopyBlock label="Landing copy"   text={b.buildArtifacts.landingCopy} />
                    <CopyBlock label="Onboarding flow" text={b.buildArtifacts.onboardingFlow} />
                    {(b.buildArtifacts.mvpFeatures?.length ?? 0) > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">MVP features</p>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                          {b.buildArtifacts.mvpFeatures?.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}
                    {(b.buildArtifacts.pricingIdeas?.length ?? 0) > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pricing ideas</p>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                          {b.buildArtifacts.pricingIdeas?.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                    {(b.buildArtifacts.roadmap30Day?.length ?? 0) > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">30-day roadmap</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-xs text-muted-foreground">
                          {b.buildArtifacts.roadmap30Day?.map((step, i) => <li key={i}>{step}</li>)}
                        </ol>
                      </div>
                    )}
                  </div>
                </Collapsible>
              )}

              {b.validationPack && (
                <Collapsible title="Launch copy & outreach">
                  <div className="space-y-4">
                    <CopyBlock label="Reddit post draft"     text={b.validationPack.redditPostDraft} />
                    <CopyBlock label="Twitter/X launch"      text={b.validationPack.twitterLaunchDraft} />
                    <CopyBlock label="Landing page copy"     text={b.validationPack.landingPageCopy} />
                    <CopyBlock label="Waitlist copy"         text={b.validationPack.waitlistCopy} />
                    <CopyBlock label="Cold outreach script"  text={b.validationPack.coldOutreachScript} />
                    <CopyBlock label="Community plan"        text={b.validationPack.communityPlan} />
                    {(b.validationPack.interviewQuestions?.length ?? 0) > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Interview questions</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-xs text-muted-foreground">
                          {b.validationPack.interviewQuestions?.map((q, i) => <li key={i}>{q}</li>)}
                        </ol>
                      </div>
                    )}
                  </div>
                </Collapsible>
              )}

            </TabsContent>

          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
