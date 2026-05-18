/**
 * IdeaForge integration test suite
 * Run: npm run test:ideas
 *
 * Tests both analyze and discover pipelines end-to-end with real signal
 * fetching + real AI calls. Be patient — each test takes ~20-40s.
 */

import { generateObject } from "ai";
import { gatherDemandSnippets, snippetsToPromptDigest } from "../src/lib/demand/gather";
import { getLanguageModel } from "../src/lib/ai/model";
import {
  ANALYST_SYSTEM,
  buildAnalystPrompt,
  DISCOVER_SYSTEM,
  buildDiscoverPrompt,
} from "../src/lib/ai/prompts";
import { ideaReportSchema } from "../src/lib/schemas/idea-report";
import { ideaDiscoverySchema } from "../src/lib/schemas/idea-discovery";

// ── helpers ──────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a","an","the","and","or","for","of","to","in","on","with","that","this",
  "is","are","it","be","by","as","at","from","into","tool","app","platform",
  "solution","system","software","service","automated","automatic","automation",
  "based","using","via","through","new","simple","easy","better","best","good",
]);

function buildSearchQuery(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 4)
    .join(" ");
}

const GREEN = "\x1b[32m";
const RED   = "\x1b[31m";
const YELLOW= "\x1b[33m";
const CYAN  = "\x1b[36m";
const DIM   = "\x1b[2m";
const BOLD  = "\x1b[1m";
const RESET = "\x1b[0m";

function pass(msg: string)  { return `${GREEN}✅ ${msg}${RESET}`; }
function fail(msg: string)  { return `${RED}❌ ${msg}${RESET}`; }
function warn(msg: string)  { return `${YELLOW}⚠️  ${msg}${RESET}`; }
function info(msg: string)  { return `${CYAN}${msg}${RESET}`; }
function dim(msg: string)   { return `${DIM}${msg}${RESET}`; }
function bold(msg: string)  { return `${BOLD}${msg}${RESET}`; }

function divider(label?: string) {
  const line = "─".repeat(60);
  console.log(label ? `\n${CYAN}${line}${RESET}\n${bold(label)}\n${CYAN}${line}${RESET}` : `\n${DIM}${line}${RESET}`);
}

// ── analyze test ─────────────────────────────────────────────────────────────

type AnalyzeResult = {
  passed: boolean;
  gateCorrect: boolean;
  snippetCount: number;
  wtpCount: number;
  issues: string[];
};

async function testAnalyze(
  idea: string,
  founderContext: string,
  shouldPass: boolean,
): Promise<AnalyzeResult> {
  const query = buildSearchQuery(idea);
  console.log(`\n${info("Idea:")} ${idea}`);
  console.log(`${info("Query:")} "${query}"`);
  console.log(`${info("Expected gate:")} ${shouldPass ? "PASS" : "DO NOT BUILD"}`);
  console.log(dim("Gathering signals…"));

  const { snippets } = await gatherDemandSnippets(query);
  const bySource = {
    reddit: snippets.filter((s) => s.source === "reddit").length,
    hn:     snippets.filter((s) => s.source === "hackernews").length,
    github: snippets.filter((s) => s.source === "github").length,
    so:     snippets.filter((s) => s.source === "stackoverflow").length,
  };
  console.log(`${dim("Signals:")} reddit=${bySource.reddit} hn=${bySource.hn} github=${bySource.github} so=${bySource.so} → ${bold(String(snippets.length))} total`);

  const digest = snippetsToPromptDigest(snippets);
  const model  = getLanguageModel();

  console.log(dim("Running AI analysis…"));
  const { object: r } = await generateObject({
    model,
    schema: ideaReportSchema,
    system: ANALYST_SYSTEM,
    prompt: buildAnalystPrompt({
      topic: idea,
      founderProfile: founderContext,
      digest,
      manualBlock: "",
      gatherErrorsBlock: "",
    }),
    temperature: 0.55,
  });

  const issues: string[] = [];

  // Gate
  const gateScore = r.validationQuality.buildGateScore;
  const gatePasses = gateScore >= 50;
  const gateCorrect = gatePasses === shouldPass;
  const gateLabel = `${gateScore}/100 (${gatePasses ? "PASS" : "DO NOT BUILD"})`;
  console.log(`\nGate:     ${gatePasses ? GREEN : RED}${gateLabel}${RESET} ${gateCorrect ? dim("(as expected)") : warn("UNEXPECTED")}`);
  if (!gateCorrect) issues.push(`Build gate mismatch: got ${gateLabel}, expected ${shouldPass ? "PASS" : "DO NOT BUILD"}`);

  // Scores
  const s = r.probabilityScores;
  const scores = [s.monetizationPotential, s.easeOfAcquisition, s.competitionIntensity, s.mvpFeasibility, s.speedToRevenue];
  const allSame = scores.every((v) => v === scores[0]);
  console.log(`Scores:   mon=${s.monetizationPotential} acq=${s.easeOfAcquisition} cmp=${s.competitionIntensity} mvp=${s.mvpFeasibility} rev=${s.speedToRevenue}`);
  if (allSame) { console.log(warn("All scores identical — likely hallucinated")); issues.push("Undifferentiated scores"); }

  // Pain clusters
  const clustersWithEvidence = r.painClusters.filter((c) => c.evidenceSnippets.length > 0);
  console.log(`\nPain clusters: ${r.painClusters.length} total, ${clustersWithEvidence.length} with evidence`);
  for (const c of r.painClusters) {
    const hasEvidence = c.evidenceSnippets.length > 0;
    console.log(`  ${hasEvidence ? GREEN + "●" : YELLOW + "○"}${RESET} ${c.theme}`);
    if (hasEvidence) {
      console.log(`    ${dim(`"${c.evidenceSnippets[0]?.slice(0, 90)}…"`)}`);
    } else {
      issues.push(`Pain cluster "${c.theme}" has no evidence snippets`);
    }
  }

  // Demand signals
  const wtp = r.demandSignalsSummary.filter((d) => d.wtpSignal);
  console.log(`\nDemand signals: ${r.demandSignalsSummary.length} total, ${wtp.length} WTP`);
  for (const d of r.demandSignalsSummary.slice(0, 4)) {
    console.log(`  [${d.source}]${d.wtpSignal ? ` ${GREEN}💰 WTP${RESET}` : ""} ${dim(`"${d.excerpt.slice(0, 80)}…"`)}`);
  }
  if (shouldPass && snippets.length > 5 && wtp.length === 0) {
    issues.push("No WTP signals despite having snippets — model may be under-scoring demand");
  }

  // First validation step
  const step1 = r.validationChecklist[0];
  if (step1) {
    const isGeneric = !step1.item.match(/reddit|hacker news|twitter|post|interview|survey|cold|community|slack/i);
    console.log(`\nFirst validation step: ${dim(`"${step1.item.slice(0, 100)}…"`)}`);
    if (isGeneric) { console.log(warn("Generic — doesn't name a specific action/platform")); issues.push("Generic validation steps"); }
  }

  // Overall verdict
  const passed = issues.length === 0;
  divider();
  if (passed) {
    console.log(pass("Output looks solid — specific, grounded, actionable"));
  } else {
    console.log(`${YELLOW}Issues found:${RESET}`);
    issues.forEach((i) => console.log(`  ${RED}•${RESET} ${i}`));
  }

  return { passed, gateCorrect, snippetCount: snippets.length, wtpCount: wtp.length, issues };
}

// ── discover test ─────────────────────────────────────────────────────────────

type DiscoverResult = {
  passed: boolean;
  ideaCount: number;
  specificIdeas: number;
  issues: string[];
};

async function testDiscover(niche: string): Promise<DiscoverResult> {
  const searchQuery = niche
    ? `${niche} pain problem frustration`
    : "startup pain points software problems";

  console.log(`\n${info("Niche:")} ${niche || "(broad — no niche)"}`);
  console.log(`${info("Query:")} "${searchQuery}"`);
  console.log(dim("Gathering signals…"));

  const { snippets } = await gatherDemandSnippets(searchQuery);
  console.log(`${dim("Signals:")} ${snippets.length} total`);

  const digest  = snippetsToPromptDigest(snippets);
  const model   = getLanguageModel();

  console.log(dim("Running AI discovery…"));
  const { object: d } = await generateObject({
    model,
    schema: ideaDiscoverySchema,
    system: DISCOVER_SYSTEM,
    prompt: buildDiscoverPrompt({ niche, digest, gatherErrorsBlock: "" }),
    temperature: 0.7,
  });

  const issues: string[] = [];

  console.log(`\nContext: ${dim(d.searchContext ?? "—")}`);
  console.log(`\nIdeas generated: ${d.ideas.length}`);

  if (d.ideas.length < 4) issues.push(`Only ${d.ideas.length} ideas — expected 6`);

  const scores = d.ideas.map((i) => i.opportunityScore);
  const allSame = scores.length > 1 && scores.every((s) => s === scores[0]);
  if (allSame) issues.push("All opportunity scores identical — model is not differentiating");

  let specificCount = 0;
  for (const idea of d.ideas) {
    // Specific = audience names a role/segment AND wedge has a concrete differentiator word
    const wedgeWords = /cheaper|faster|offline|open.source|ai|auto|without|unlike|only|specific|niche|\$|free|local|real|beyond|no subscription|one.click|tailored|eliminates|removes|replaces|simpler|reduces|reduction|than |compared|integrat|machine learning|by \d|x faster|x cheaper|\d+%|eliminat|instead of/i;
    const isSpecific = idea.targetAudience.length > 12 && wedgeWords.test(idea.coreWedge);
    if (isSpecific) specificCount++;
    const scoreColor = idea.opportunityScore >= 65 ? GREEN : idea.opportunityScore >= 40 ? YELLOW : RED;
    console.log(`\n  ${scoreColor}${idea.opportunityScore}/100${RESET}  ${bold(idea.title)}`);
    console.log(`    ${dim(idea.oneLiner)}`);
    console.log(`    For: ${idea.targetAudience}`);
    console.log(`    Wedge: ${idea.coreWedge}`);
    console.log(`    First step: ${dim(idea.firstValidationStep)}`);
    if (!isSpecific) issues.push(`Idea "${idea.title}" — wedge not concrete enough: "${idea.coreWedge}"`);
  }

  const passed = issues.length === 0;
  divider();
  if (passed) {
    console.log(pass("Discovery output looks specific and actionable"));
  } else {
    console.log(`${YELLOW}Issues found:${RESET}`);
    issues.forEach((i) => console.log(`  ${RED}•${RESET} ${i}`));
  }

  return { passed, ideaCount: d.ideas.length, specificIdeas: specificCount, issues };
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════╗`);
  console.log(`║      IdeaForge Integration Test Suite      ║`);
  console.log(`╚══════════════════════════════════════════╝${RESET}\n`);

  const analyzeTests: Array<{ idea: string; founder: string; shouldPass: boolean }> = [
    {
      idea: "Time tracking for freelancers without subscription",
      founder: "full-stack developer, been freelancing 2 years",
      shouldPass: true,
    },
    {
      idea: "AI mock technical interview practice for software engineers",
      founder: "CS student, built small web apps, familiar with LLM APIs",
      shouldPass: true,
    },
    {
      idea: "Generic todo list app",
      founder: "first-time founder, no specific background",
      shouldPass: false,
    },
    {
      idea: "Free phones for the poor",
      founder: "college student, no telecom background",
      shouldPass: false,
    },
  ];

  const discoverTests = [
    { niche: "developer tools" },
    { niche: "" },
  ];

  const analyzeResults: AnalyzeResult[] = [];
  const discoverResults: DiscoverResult[] = [];

  // ── Analyze tests ──
  divider("ANALYZE TESTS  (I have an idea)");
  for (const t of analyzeTests) {
    divider(`Testing: "${t.idea}"`);
    const result = await testAnalyze(t.idea, t.founder, t.shouldPass);
    analyzeResults.push(result);
  }

  // ── Discover tests ──
  divider("DISCOVER TESTS  (Find me ideas)");
  for (const t of discoverTests) {
    divider(`Niche: "${t.niche || "broad"}"`);
    const result = await testDiscover(t.niche);
    discoverResults.push(result);
  }

  // ── Summary ──
  divider("FINAL SUMMARY");

  const allAnalyzePassed   = analyzeResults.filter((r) => r.passed).length;
  const gateCorrect        = analyzeResults.filter((r) => r.gateCorrect).length;
  const allDiscoverPassed  = discoverResults.filter((r) => r.passed).length;

  console.log(`\n${bold("Analyze tests:")} ${allAnalyzePassed}/${analyzeResults.length} passed`);
  console.log(`${bold("Gate correct:")}   ${gateCorrect}/${analyzeResults.length} (expected pass/fail decisions)`);
  console.log(`${bold("Discover tests:")} ${allDiscoverPassed}/${discoverResults.length} passed`);

  const allPassed = allAnalyzePassed === analyzeResults.length && allDiscoverPassed === discoverResults.length;
  console.log(`\n${allPassed ? pass("All tests passed") : fail("Some tests have issues — see above")}\n`);

  // Aggregated issues
  const allIssues = [...analyzeResults, ...discoverResults].flatMap((r) => r.issues);
  if (allIssues.length > 0) {
    console.log(`${bold("All issues found:")}`);
    allIssues.forEach((i) => console.log(`  ${RED}•${RESET} ${i}`));
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(RED + "Test run failed:" + RESET, e);
  process.exit(1);
});
