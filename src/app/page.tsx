import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, Sparkles, TrendingUp, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="noise-overlay relative min-h-[100dvh] overflow-hidden px-6 py-10 md:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(94,106,255,0.28),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(144,92,255,0.2),transparent_28%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="glass-panel rounded-2xl border border-border/70 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-tight">IdeaForge</p>
              <p className="text-xs text-muted-foreground">
                AI startup opportunity operating system
              </p>
            </div>
            <Link
              href="/workspace"
              className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Open Workspace
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <Badge className="bg-primary/20 text-primary">Founder-grade AI</Badge>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Find startup ideas people are already begging for.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              Mine real complaints, validate demand, analyze competitors, and
              generate launch-ready MVP plans with AI.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/workspace"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition hover:opacity-90"
              >
                Launch IdeaForge
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/workspace"
                className="inline-flex h-10 items-center rounded-lg border border-border bg-background/70 px-4 text-sm font-medium transition hover:bg-muted/40"
              >
                View live workspace
              </Link>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-border/70 p-5 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/90">
              Example opportunity
            </p>
            <h3 className="mt-3 text-lg font-semibold">
              Agencies keep complaining Shopify analytics are too slow.
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Metric label="Opportunity score" value="82/100" tone="text-emerald-300" />
              <Metric label="Competition intensity" value="64/100" tone="text-amber-300" />
              <Metric label="Wedge confidence" value="High" tone="text-sky-300" />
              <Metric label="Time to MVP" value="12 days" tone="text-violet-300" />
            </div>
            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              <p>- Competitors optimize for enterprise dashboards, not agency speed.</p>
              <p>- Users still export CSV + spreadsheets daily.</p>
              <p>- Strong willingness-to-pay from agencies managing 10+ stores.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Feature
            icon={TrendingUp}
            title="Real demand mining"
            text="Cluster live complaints into opportunities with confidence scoring."
          />
          <Feature
            icon={ShieldCheck}
            title="Brutal validation gates"
            text="Get explicit don't-build warnings before wasting build cycles."
          />
          <Feature
            icon={Sparkles}
            title="Execution artifacts"
            text="Generate Lovable, v0, Cursor prompts, roadmap, and GTM scripts."
          />
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/55 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="glass-panel rounded-2xl border border-border/70 p-4">
      <Icon className="size-4 text-primary" />
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
