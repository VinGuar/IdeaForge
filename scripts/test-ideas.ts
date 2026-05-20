/**
 * IdeaForge integration test suite — "I have an idea" section
 * Run: npm run test:ideas
 *
 * Tests analyze pipeline end-to-end with real signal fetching + real AI calls.
 * Each test takes ~30-60s. Variety: with/without founder, strong/weak ideas,
 * domain-specific (proper nouns) to stress-test query shortening.
 */

import { generateText, Output } from "ai";
import { gatherDemandSnippets, snippetsToPromptDigest } from "../src/lib/demand/gather";
import { extractSearchQuery } from "../src/lib/demand/extract-query";
import { getLanguageModel } from "../src/lib/ai/model";
import { ANALYST_SYSTEM, buildAnalystPrompt } from "../src/lib/ai/prompts";
import { ideaReportSchema } from "../src/lib/schemas/idea-report";

// ── colours ───────────────────────────────────────────────────────────────────

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const DIM    = "\x1b[2m";
const BOLD   = "\x1b[1m";
const RESET  = "\x1b[0m";

const pass = (msg: string) => `${GREEN}✅ ${msg}${RESET}`;
const fail = (msg: string) => `${RED}❌ ${msg}${RESET}`;
const warn = (msg: string) => `${YELLOW}⚠️  ${msg}${RESET}`;
const info = (msg: string) => `${CYAN}${msg}${RESET}`;
const dim  = (msg: string) => `${DIM}${msg}${RESET}`;
const bold = (msg: string) => `${BOLD}${msg}${RESET}`;

function divider(label?: string) {
  const line = "─".repeat(64);
  if (label) {
    console.log(`\n${CYAN}${line}${RESET}`);
    console.log(bold(label));
    console.log(`${CYAN}${line}${RESET}`);
  } else {
    console.log(`\n${DIM}${line}${RESET}`);
  }
}

// ── query quality check ────────────────────────────────────────────────────────

/**
 * Returns issues with the generated query.
 * A good query: preserves proper nouns from the idea, avoids generic filler,
 * has 2-4 meaningful words.
 */
function auditQuery(idea: string, query: string): string[] {
  const issues: string[] = [];
  const words = query.split(/\s+/);

  if (words.length < 2) issues.push("Query too short — only 1 word");
  if (words.length > 4) issues.push(`Query too long — ${words.length} words (max 4)`);

  // Check that proper nouns from the idea appear in query
  // Only care about mid-sentence capitals (index > 0) — start-of-sentence caps are not proper nouns
  const properNouns = [...idea.matchAll(/(?<!\.\s{0,5})\b([A-Z][a-z]{2,})\b/g)].map(m => m[1]);
  const COMMON_CAPS = new Set(["App","Tool","Build","Find","Help","For","The","With","That","This","An","Free","Just","Make","Good","Best","Clean","Beautiful"]);
  const significantProper = properNouns.filter((n) => {
    const isFirstWord = idea.indexOf(n) === 0 || idea.startsWith("A " + n) || idea.startsWith("An " + n);
    return !COMMON_CAPS.has(n) && !isFirstWord;
  });
  for (const noun of significantProper) {
    if (!query.toLowerCase().includes(noun.toLowerCase())) {
      issues.push(`Proper noun "${noun}" from idea was dropped from query`);
    }
  }

  // Generic filler that should have been excluded
  const genericWords = ["tool","platform","software","service","solution","build","create","make","need","want","app"];
  for (const w of words) {
    if (genericWords.includes(w.toLowerCase())) {
      issues.push(`Generic word "${w}" made it into query`);
    }
  }

  return issues;
}

// ── main analyze runner ───────────────────────────────────────────────────────

type TestResult = {
  idea: string;
  founder: string;
  query: string;
  queryIssues: string[];
  snippetCount: number;
  gateScore: number;
  gatePasses: boolean;
  gateCorrect: boolean;
  scores: Record<string, number>;
  scoreIssues: string[];
  allIssues: string[];
};

async function runAnalyze(
  idea: string,
  founder: string,
  shouldPass: boolean,
): Promise<TestResult> {
  console.log(`\n${info("Idea:")}    ${idea}`);
  if (founder) console.log(`${info("Founder:")} ${founder}`);
  else         console.log(`${dim("Founder:")} ${dim("(none provided)")}`);

  // Real AI-based query extraction
  const query = await extractSearchQuery(idea);
  console.log(`${info("Query:")}   ${bold(`"${query}"`)}`);

  const queryIssues = auditQuery(idea, query);
  if (queryIssues.length === 0) {
    console.log(dim("          Query looks good ✓"));
  } else {
    for (const qi of queryIssues) console.log(warn(`          Query: ${qi}`));
  }

  console.log(dim("Gathering signals…"));
  const { snippets } = await gatherDemandSnippets(query);
  const bySource = {
    reddit: snippets.filter(s => s.source === "reddit").length,
    hn:     snippets.filter(s => s.source === "hackernews").length,
    github: snippets.filter(s => s.source === "github").length,
    so:     snippets.filter(s => s.source === "stackoverflow").length,
  };
  console.log(`${dim("Signals:")} reddit=${bySource.reddit} hn=${bySource.hn} github=${bySource.github} so=${bySource.so} → ${bold(String(snippets.length))} total`);

  const digest = snippetsToPromptDigest(snippets);
  const model  = getLanguageModel();

  console.log(dim("Running AI analysis…"));
  const { output: r } = await generateText({
    model,
    output: Output.object({ schema: ideaReportSchema }),
    system: ANALYST_SYSTEM,
    prompt: buildAnalystPrompt({ topic: idea, founderProfile: founder, digest, manualBlock: "", gatherErrorsBlock: "" }),
    temperature: 0.55,
  });

  // ── Gate score ──
  const gateScore  = r.validationQuality.buildGateScore;
  const gatePasses = gateScore >= 65;
  const gateCorrect = gatePasses === shouldPass;
  const gateColor  = gatePasses ? GREEN : RED;
  console.log(`\n${bold("BUILD GATE:")} ${gateColor}${gateScore}/100${RESET} ${gateColor}(${gatePasses ? "PASS ✓" : "DO NOT BUILD ✗"})${RESET} — expected ${shouldPass ? "PASS" : "DO NOT BUILD"} ${gateCorrect ? dim("✓ correct") : warn("← UNEXPECTED")}`);

  // Gate reasons
  for (const reason of r.validationQuality.reasons.slice(0, 3)) {
    console.log(`  ${dim("•")} ${dim(reason)}`);
  }

  // ── Scores ──
  const s = r.probabilityScores;
  const ex = r.probabilityScoreExplanations;
  console.log(`\n${bold("SCORES:")}`);

  const scoreRows: Array<{ label: string; key: keyof typeof s; exKey: keyof typeof ex; invert?: boolean }> = [
    { label: "Monetization potential", key: "monetizationPotential", exKey: "monetizationPotential" },
    { label: "Ease of acquisition",    key: "easeOfAcquisition",     exKey: "easeOfAcquisition"     },
    { label: "Competition intensity",  key: "competitionIntensity",  exKey: "competitionIntensity",  invert: true },
    { label: "Founder viability",      key: "founderViability",      exKey: "founderViability"      },
  ];

  const scoreIssues: string[] = [];
  const scoreValues = scoreRows.map(row => s[row.key]);
  const allSame = scoreValues.every(v => v === scoreValues[0]);
  if (allSame) scoreIssues.push("All probability scores identical — likely hallucinated");

  for (const row of scoreRows) {
    const v = s[row.key];
    const good = row.invert ? v < 40 : v >= 65;
    const mid  = row.invert ? v < 65 : v >= 40;
    const color = good ? GREEN : mid ? YELLOW : RED;
    const bar = "█".repeat(Math.round(v / 5)).padEnd(20, "░");
    console.log(`  ${color}${String(v).padStart(3)}${RESET}  ${bar}  ${row.label}`);
    console.log(`       ${dim(ex[row.exKey]?.slice(0, 110) ?? "—")}`);
  }

  if (allSame) console.log(warn("  All scores identical — model is not differentiating"));

  // ── Top signals ──
  const wtpSignals = r.topSignals.filter(s => s.wtpEvidence);
  console.log(`\n${bold("Top signals:")} ${r.topSignals.length} (${wtpSignals.length} with WTP evidence)`);
  for (const sig of r.topSignals) {
    const color = sig.strength === "strong" ? GREEN : sig.strength === "weak" ? RED : YELLOW;
    console.log(`  ${color}[${sig.strength}]${RESET} ${sig.observation.slice(0, 100)}${sig.wtpEvidence ? " 💰" : ""}`);
  }
  if (shouldPass && snippets.length > 5 && wtpSignals.length === 0) {
    scoreIssues.push("No WTP evidence in topSignals despite sufficient snippets");
  }

  // ── Don't-build warnings ──
  console.log(`\n${bold("Don't-build warnings:")}`);
  for (const w of r.dontBuildWarnings.slice(0, 3)) {
    const color = w.severity === "critical" ? RED : w.severity === "warning" ? YELLOW : CYAN;
    console.log(`  ${color}[${w.severity.toUpperCase()}]${RESET} ${w.title}`);
    console.log(`         ${dim(w.detail.slice(0, 100))}`);
  }

  const allIssues = [...queryIssues, ...scoreIssues, ...(gateCorrect ? [] : [`Build gate mismatch: got ${gateScore}/100 (${gatePasses ? "PASS" : "DO NOT BUILD"}), expected ${shouldPass ? "PASS" : "DO NOT BUILD"}`])];

  divider();
  if (allIssues.length === 0) {
    console.log(pass("Output looks solid"));
  } else {
    console.log(`${YELLOW}Issues:${RESET}`);
    allIssues.forEach(i => console.log(`  ${RED}•${RESET} ${i}`));
  }

  return { idea, founder, query, queryIssues, snippetCount: snippets.length, gateScore, gatePasses, gateCorrect, scores: { monetizationPotential: s.monetizationPotential, easeOfAcquisition: s.easeOfAcquisition, competitionIntensity: s.competitionIntensity, founderViability: s.founderViability }, scoreIssues, allIssues };
}

// ── test cases ────────────────────────────────────────────────────────────────

const TESTS: Array<{ idea: string; founder: string; shouldPass: boolean; label: string; scoreHint: string }> = [
  // ── 🟢 GREAT — expect 75+ ─────────────────────────────────────────────────
  {
    label: "1. API for accepting online payments without bank/fraud/compliance complexity  [expect 75+]",
    idea: "API that lets developers accept online payments without dealing with banks, fraud systems, or compliance complexity",
    founder: "",
    shouldPass: true,
    scoreHint: "GREAT",
  },
  {
    label: "2. Platform to rent spare rooms to travellers  [expect 75+]",
    idea: "Platform where people rent spare rooms or unused space in their homes to travelers",
    founder: "",
    shouldPass: true,
    scoreHint: "GREAT",
  },
  {
    label: "3. On-demand private rides with dynamic pricing  [expect 75+]",
    idea: "App that lets users request on-demand private rides in cities with dynamic pricing",
    founder: "",
    shouldPass: true,
    scoreHint: "GREAT",
  },
  {
    label: "4. All-in-one docs, notes, and lightweight database workspace for teams  [expect 75+]",
    idea: "All-in-one workspace combining docs, notes, and lightweight databases for teams",
    founder: "",
    shouldPass: true,
    scoreHint: "GREAT",
  },
  {
    label: "5. Fast issue tracker for modern software engineering teams  [expect 75+]",
    idea: "Fast issue tracking system designed specifically for modern software engineering teams",
    founder: "",
    shouldPass: true,
    scoreHint: "GREAT",
  },

  // ── 🔴 BAD — expect under 45 ──────────────────────────────────────────────
  {
    label: "6. P2P textbook rental marketplace for students  [expect <45]",
    idea: "Peer-to-peer marketplace for students to rent used textbooks from each other",
    founder: "",
    shouldPass: false,
    scoreHint: "BAD",
  },
  {
    label: "7. Anonymous college campus social app, no identity verification  [expect <45]",
    idea: "Anonymous social app for college campuses with no identity verification",
    founder: "",
    shouldPass: false,
    scoreHint: "BAD",
  },
  {
    label: "8. Free resume and cover letter generator, no paid tier  [expect <45]",
    idea: "Free tool that generates resumes and cover letters with no paid tier",
    founder: "",
    shouldPass: false,
    scoreHint: "BAD",
  },
  {
    label: "9. Ad-based todo list with no differentiation  [expect <45]",
    idea: "Ad-based todo list app with no differentiation or workflow integration",
    founder: "",
    shouldPass: false,
    scoreHint: "BAD",
  },
  {
    label: "10. Anonymous platform for rating individual managers  [expect <45]",
    idea: "Anonymous platform for rating and reviewing individual managers at companies",
    founder: "",
    shouldPass: false,
    scoreHint: "BAD",
  },

  // ── 🟡 MID — expect 50–72 ─────────────────────────────────────────────────
  {
    label: "11. Meeting summarizer + action item extractor  [expect 50-72]",
    idea: "Tool that summarizes meetings and extracts action items automatically",
    founder: "",
    shouldPass: true,
    scoreHint: "MID",
  },
  {
    label: "12. Personal relationship tracker with follow-up reminders  [expect 50-72]",
    idea: "System that tracks personal relationships and reminds users to follow up",
    founder: "",
    shouldPass: false,
    scoreHint: "MID",
  },
  {
    label: "13. AI code PR review and improvement suggester  [expect 50-72]",
    idea: "AI tool that reviews code pull requests and suggests improvements",
    founder: "",
    shouldPass: true,
    scoreHint: "MID",
  },
  {
    label: "14. Meal plan generator from fridge photos  [expect 50-72]",
    idea: "App that generates meal plans based on photos of food in your fridge",
    founder: "",
    shouldPass: false,
    scoreHint: "MID",
  },
  {
    label: "15. Invoice follow-up reminder tool for small businesses  [expect 50-72]",
    idea: "Tool that reminds small businesses to follow up on unpaid invoices",
    founder: "",
    shouldPass: true,
    scoreHint: "MID",
  },
];

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║           IdeaForge — "I Have an Idea" Test Suite             ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(dim("Tests run sequentially. Each takes ~30-60s.\n"));

  const results: TestResult[] = [];

  for (const t of [TESTS[0], TESTS[4], TESTS[5], TESTS[9]]) {
    divider(`TEST: ${t.label}`);
    const r = await runAnalyze(t.idea, t.founder, t.shouldPass);
    results.push(r);
  }

  // ── Final summary table ───────────────────────────────────────────────────
  divider("FINAL SUMMARY");

  const col = (s: string, w: number) => s.slice(0, w).padEnd(w);

  console.log(`\n${bold(col("Idea (truncated)", 38))}  ${bold(col("Query", 26))}  ${bold("Gate")}  ${bold("Hint")}    ${bold("OK?")}`);
  console.log(DIM + "─".repeat(90) + RESET);

  for (const [i, r] of results.entries()) {
    const t = TESTS[i]!;
    const gateColor = r.gatePasses ? GREEN : RED;
    const okColor   = r.gateCorrect ? GREEN : RED;
    const queryFlag = r.queryIssues.length > 0 ? YELLOW + "⚠" + RESET : GREEN + "✓" + RESET;
    const hint = t.scoreHint === "GREAT" ? GREEN  + "GREAT " + RESET
               : t.scoreHint === "MID"   ? YELLOW + "MID   " + RESET
               :                           RED    + "BAD   " + RESET;
    console.log(
      `${col(r.idea, 38)}  ${col(r.query, 26)} ${queryFlag}  ${gateColor}${String(r.gateScore).padStart(3)}/100${RESET}  ${hint}  ${okColor}${r.gateCorrect ? "✓" : "✗"}${RESET}`
    );
  }

  const gateCorrectCount = results.filter(r => r.gateCorrect).length;
  const queryCleanCount  = results.filter(r => r.queryIssues.length === 0).length;
  const totalIssues      = results.flatMap(r => r.allIssues);

  console.log(`\n${bold("Gate correct:")}  ${gateCorrectCount}/${results.length}`);
  console.log(`${bold("Query quality:")} ${queryCleanCount}/${results.length} clean`);

  if (totalIssues.length > 0) {
    console.log(`\n${bold("All issues:")}`);
    totalIssues.forEach(i => console.log(`  ${RED}•${RESET} ${i}`));
  }

  const allGood = gateCorrectCount === results.length;
  console.log(`\n${allGood ? pass("All gate predictions correct") : fail("Some gate predictions wrong — see above")}\n`);

  process.exit(allGood ? 0 : 1);
}

main().catch(e => {
  console.error(RED + "Test run failed:" + RESET, e);
  process.exit(1);
});
