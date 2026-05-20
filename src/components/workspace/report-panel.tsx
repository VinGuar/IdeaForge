"use client";

import { useState } from "react";
import type { DeepPartial } from "ai";
import type { IdeaReport } from "@/lib/schemas/idea-report";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  Gauge,
  Loader2,
  Rocket,
  TriangleAlert,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// ── Score explainer (collapsible inline) ─────────────────────────────────────

const SCORE_HOW: Record<string, string> = {
  "Monetization potential": "Is there a clear payer willing to spend real money? Goes up when people already pay for something similar. Goes down when users expect it free.",
  "Ease of acquisition": "How hard is it to find and convert customers? Goes up when there are obvious channels. Goes down when customers are hard to reach or require heavy convincing.",
  "Competition intensity": "How fierce and entrenched is the competition? Higher = tougher. Goes up when big players dominate. Goes down when the space is fragmented or weak.",
  "Founder viability": "Can a solo founder or small team realistically build and grow this? Goes up when the scope is tight and the market accessible. Goes down when it needs a team, capital, or rare expertise.",
};

function ScoreBar({ label, value, invert, explanation }: {
  label: string; value?: number; invert?: boolean; explanation?: string;
}) {
  const [open, setOpen] = useState(false);
  const v = typeof value === "number" ? Math.min(100, Math.max(0, value)) : 0;
  const good = invert ? v < 40 : v >= 65;
  const mid  = invert ? v < 65 : v >= 40;
  const barColor  = good ? "bg-emerald-500" : mid ? "bg-amber-500" : "bg-red-500";
  const textColor = good ? "text-emerald-400" : mid ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 text-xs hover:opacity-80 transition-opacity"
      >
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`tabular-nums font-semibold ${textColor}`}>{v}</span>
          <ChevronDown className={`size-3 text-muted-foreground/40 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${v}%` }} />
      </div>
      {open && (
        <div className="rounded-md border border-border/50 bg-muted/30 px-2.5 py-2 text-[11px] space-y-1.5">
          {SCORE_HOW[label] && <p className="text-muted-foreground">{SCORE_HOW[label]}</p>}
          {explanation && <p className="text-foreground/80">{explanation}</p>}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReportPanel({ partial, streaming, onSwitchToFinisher }: {
  partial: DeepPartial<IdeaReport> | undefined;
  streaming: boolean;
  onSwitchToFinisher?: () => void;
}) {
  if (!partial && !streaming) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <Gauge className="size-10 opacity-20" />
        <p className="text-sm font-medium text-foreground">No verdict yet</p>
        <p className="text-xs text-muted-foreground">Run the analysis on the left to get a fast verdict on your idea.</p>
      </div>
    );
  }

  const gate   = partial?.validationQuality;
  const scores = partial?.probabilityScores;
  const expl   = partial?.probabilityScoreExplanations;
  const score  = typeof gate?.buildGateScore === "number" ? gate.buildGateScore : null;
  const isGreen  = score !== null && score >= 65;
  const isYellow = score !== null && score >= 40 && score < 65;

  const scoreColors = isGreen
    ? { num: "text-emerald-400", bar: "bg-emerald-500", border: "border-emerald-500/30", bg: "bg-emerald-500/[0.07]" }
    : isYellow
      ? { num: "text-amber-400",   bar: "bg-amber-500",   border: "border-amber-500/30",   bg: "bg-amber-500/[0.07]" }
      : { num: "text-red-400",     bar: "bg-red-500",     border: "border-red-500/30",     bg: "bg-red-500/[0.07]" };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-16 space-y-5">

        {/* ── VERDICT HEADER ──────────────────────────────────────────── */}
        <div className={`rounded-2xl border px-5 py-5 space-y-4 ${score !== null ? `${scoreColors.border} ${scoreColors.bg}` : "border-border/60 bg-muted/20"}`}>

          {/* Score + verdict label */}
          <div className="flex items-start gap-4">
            {score !== null ? (
              <span className={`text-6xl font-bold tabular-nums leading-none shrink-0 ${scoreColors.num}`}>
                {score}
              </span>
            ) : streaming ? (
              <Loader2 className="size-8 animate-spin text-muted-foreground mt-1" />
            ) : null}
            <div className="min-w-0 pt-1">
              {gate?.verdict && (
                <p className={`text-sm font-bold uppercase tracking-wide ${score !== null ? scoreColors.num : "text-muted-foreground"}`}>
                  {gate.verdict}
                </p>
              )}
              {partial?.title && (
                <p className="mt-0.5 text-sm font-semibold text-foreground leading-snug">{partial.title}</p>
              )}
              {partial?.oneLiner && (
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{partial.oneLiner}</p>
              )}
            </div>
          </div>

          {/* Score bar */}
          {score !== null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/20">
              <div className={`h-full rounded-full transition-all duration-700 ${scoreColors.bar}`} style={{ width: `${score}%` }} />
            </div>
          )}

          {/* Summary prose */}
          {gate?.summary && (
            <p className="text-sm text-foreground/85 leading-relaxed">{gate.summary}</p>
          )}

          {/* Reason bullets */}
          {(gate?.reasons?.length ?? 0) > 0 && (
            <ul className="space-y-1">
              {gate!.reasons!.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                  {r}
                </li>
              ))}
            </ul>
          )}

          {partial?.dataRetrievalNote && (
            <p className="text-[10px] text-muted-foreground/50 border-t border-border/30 pt-3">
              {partial.dataRetrievalNote}
            </p>
          )}
        </div>

        {/* ── STRUCTURAL RISKS ────────────────────────────────────────── */}
        {(partial?.dontBuildWarnings?.length ?? 0) > 0 && (
          <section className="space-y-2">
            <SectionLabel>Structural risks</SectionLabel>
            {partial!.dontBuildWarnings!.map((w, i) => (
              <div key={i} className={`rounded-xl border px-3 py-2.5 text-xs space-y-1 ${
                w?.severity === "critical" ? "border-red-500/40 bg-red-500/8" :
                w?.severity === "warning"  ? "border-amber-500/40 bg-amber-500/8" :
                                             "border-border/60 bg-muted/20"
              }`}>
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <TriangleAlert className="size-3 shrink-0 opacity-70" />
                  {w?.title}
                </div>
                <p className="text-muted-foreground leading-relaxed">{w?.detail}</p>
              </div>
            ))}
          </section>
        )}

        {/* ── TOP SIGNALS ─────────────────────────────────────────────── */}
        {(partial?.topSignals?.length ?? 0) > 0 && (
          <section className="space-y-2">
            <SectionLabel>Top signals</SectionLabel>
            <div className="rounded-xl border border-border/60 bg-background/40 divide-y divide-border/40">
              {partial!.topSignals!.map((s, i) => {
                if (!s) return null;
                const Icon = s.strength === "strong" ? TrendingUp : s.strength === "weak" ? TrendingDown : Minus;
                const iconColor = s.strength === "strong" ? "text-emerald-400" : s.strength === "weak" ? "text-red-400" : "text-amber-400";
                return (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
                    <Icon className={`size-3.5 shrink-0 mt-0.5 ${iconColor}`} />
                    <p className="text-xs text-foreground/85 leading-relaxed flex-1">{s.observation}</p>
                    {s.wtpEvidence && (
                      <span className="shrink-0 text-[10px] rounded-full bg-violet-600/20 text-violet-300 px-1.5 py-0.5 font-medium">
                        💰 WTP
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {(partial?.weakDemandSignals?.length ?? 0) > 0 && (
              <div className="rounded-xl border border-border/50 bg-muted/10 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 mb-1.5">Weak signals</p>
                <ul className="space-y-1">
                  {partial!.weakDemandSignals!.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/30" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ── PROBABILITY SCORES ──────────────────────────────────────── */}
        {scores && (
          <section className="space-y-2">
            <SectionLabel>Scores</SectionLabel>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-3">
              <ScoreBar label="Monetization potential" value={scores.monetizationPotential} explanation={expl?.monetizationPotential} />
              <ScoreBar label="Ease of acquisition"    value={scores.easeOfAcquisition}     explanation={expl?.easeOfAcquisition} />
              <ScoreBar label="Competition intensity"  value={scores.competitionIntensity}   invert explanation={expl?.competitionIntensity} />
              <ScoreBar label="Founder viability"      value={scores.founderViability}       explanation={expl?.founderViability} />
            </div>
          </section>
        )}

        {/* ── FINISHER CTA ────────────────────────────────────────────── */}
        {!streaming && score !== null && onSwitchToFinisher && (
          <section className="rounded-xl border border-border/50 bg-muted/10 px-4 py-4 text-center space-y-2">
            <p className="text-xs font-medium text-foreground">
              {isGreen  ? "Strong foundation. Ready to build it out?" :
               isYellow ? "There's potential here, but key questions remain." :
                          "Weak in raw form. Worth exploring what it would take to fix it."}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {score >= 40
                ? "Head to Idea Finisher to define positioning, MVP, GTM, and turn this into a real business plan."
                : "Idea Finisher can help you explore pivots and repositioning before you commit further."}
            </p>
            <Button
              type="button"
              size="sm"
              variant={isGreen ? "default" : "outline"}
              className="gap-1.5 text-xs"
              onClick={onSwitchToFinisher}
            >
              <Rocket className="size-3.5" />
              Open Idea Finisher
            </Button>
          </section>
        )}

      </div>
    </ScrollArea>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
      {children}
    </p>
  );
}
