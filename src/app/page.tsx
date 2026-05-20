import Link from "next/link";
import { ArrowRight, BarChart2, FileText, MessageSquare, Search } from "lucide-react";

export default function Home() {
  return (
    <div className="noise-overlay relative min-h-[100dvh] overflow-x-hidden bg-background text-foreground">

      {/* Nav */}
      <header className="relative flex h-16 items-center justify-between border-b border-border/70 bg-background px-6 md:px-12">
        <p className="text-sm font-semibold tracking-tight">IdeaForge</p>
        <Link
          href="/workspace"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open app
          <ArrowRight className="size-4" />
        </Link>
      </header>

      <div className="relative mx-auto max-w-4xl px-6 md:px-12">

        {/* Hero */}
        <section className="py-20 text-center md:py-28">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-[3.25rem]">
            Find out if your idea is worth building.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Paste in your idea. IdeaForge scans Reddit, Hacker News, and GitHub for real complaints, then tells you whether people would actually pay for it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/workspace"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-md transition-opacity hover:opacity-90"
            >
              Try it free
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/workspace"
              className="inline-flex h-11 items-center rounded-lg border border-border/70 bg-card px-6 text-sm font-medium transition-colors hover:bg-muted/40"
            >
              See a sample report
            </Link>
          </div>
        </section>

        {/* Steps */}
        <section className="pb-20">
          <h2 className="mb-10 text-center text-xl font-semibold tracking-tight">How it works</h2>
          <div className="space-y-4">
            <StepRow
              number="1"
              title="Describe your idea"
              text="Write your idea in plain English. Just describe the problem you want to solve and who has it."
            />
            <StepRow
              number="2"
              title="We find real evidence"
              text="IdeaForge searches Reddit, Hacker News, GitHub, and Stack Overflow for real people complaining about that exact problem. No made-up data."
            />
            <StepRow
              number="3"
              title="Get a clear verdict"
              text='You receive a scored report that tells you whether to build, what the biggest risks are, and what to do first if you move forward.'
            />
          </div>
        </section>

        {/* What you get */}
        <section className="pb-20">
          <h2 className="mb-3 text-center text-xl font-semibold tracking-tight">What's in your report</h2>
          <p className="mb-10 text-center text-sm text-muted-foreground">
            Everything you need to make a confident decision.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReportCard
              icon={BarChart2}
              title="Build gate score"
              text="A 0–100 score based on real demand signals. High score means there's evidence people want this. Low score means stop and rethink."
            />
            <ReportCard
              icon={Search}
              title="Real complaints, sourced"
              text="Actual posts and quotes from people experiencing the problem. Not summaries, real excerpts with sources you can click."
            />
            <ReportCard
              icon={FileText}
              title="Competitor gaps"
              text="A breakdown of who already exists in the space, what they're getting wrong, and where there's room for you."
            />
            <ReportCard
              icon={MessageSquare}
              title="Validation kit + build plan"
              text="Ready-to-send Reddit posts, landing page copy, and interview questions to validate further. Plus AI prompts to start building."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mb-20 rounded-2xl border border-border/70 bg-card px-8 py-12 text-center">
          <h2 className="text-xl font-semibold tracking-tight">Ready to stop guessing?</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            Most founders build things nobody asked for. IdeaForge shows you the evidence before you commit.
          </p>
          <Link
            href="/workspace"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Validate your idea
            <ArrowRight className="size-4" />
          </Link>
        </section>

      </div>

      <footer className="border-t border-border/70 px-6 py-5 text-center text-xs text-muted-foreground">
        IdeaForge. Validate demand before you ship.
      </footer>
    </div>
  );
}

function StepRow({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex gap-5 rounded-xl border border-border/70 bg-card px-5 py-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
        {number}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function ReportCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-5">
      <Icon className="size-4 text-primary/70" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
