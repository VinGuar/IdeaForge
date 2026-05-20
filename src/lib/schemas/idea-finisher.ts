import { z } from "zod";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

export const finisherDemandSignalSchema = z.object({
  source: z.string(),
  excerpt: z.string(),
  url: z.string().nullable(),
  painThemes: z.array(z.string()),
  wtpSignal: z.boolean(),
  frustration: z.enum(["low", "medium", "high"]),
});

export const finisherCompetitorSchema = z.object({
  name: z.string(),
  url: z.string().nullable(),
  pricing: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  commonComplaints: z.array(z.string()),
  sentiment: z.string(),
});

export const finisherPainClusterSchema = z.object({
  theme: z.string(),
  evidenceSnippets: z.array(z.string()),
  opportunityHypothesis: z.string(),
});

// ── Comprehensive finisher schema ────────────────────────────────────────────
// Contains everything needed to turn a validated idea into a real startup:
// 1. Strategic blueprint  (new — defines what to build)
// 2. Market research      (deep evidence — pain, demand, signals)
// 3. Market context       (size, trends, competition)
// 4. Execution materials  (build artifacts, launch copy, founder fit)

export const ideaFinisherSchema = z.object({

  // ── 1. STRATEGIC BLUEPRINT ──────────────────────────────────────────
  positioning: z.string(),
  targetUser: z.object({
    primary: z.string(),
    secondary: z.string(),
    painContext: z.string(),
    whyExistingFail: z.string(),
  }),
  coreProblem: z.string(),
  mvp: z.object({
    features: z.array(z.string()),
    excluded: z.array(z.string()),
    platform: z.string(),
    behavior: z.string(),
  }),
  wedgeStrategy: z.object({
    summary: z.string(),
    channels: z.array(z.string()),
  }),
  monetization: z.object({
    model: z.string(),
    pricingIdea: z.string(),
    rationale: z.string(),
  }),
  gtmSteps: z.array(z.string()),
  buildOrder: z.array(z.string()),
  executionRisks: z.array(z.object({
    risk: z.string(),
    mitigation: z.string(),
  })),

  // ── 2. MARKET RESEARCH ─────────────────────────────────────────────
  painClusters: z.array(finisherPainClusterSchema),
  demandSignalsSummary: z.array(finisherDemandSignalSchema),

  // ── 3. MARKET CONTEXT ──────────────────────────────────────────────
  problemAnalysis: z.object({
    customerPain: z.string(),
    whoExperiences: z.string(),
    frequency: z.string(),
    urgency: z.enum(["low", "medium", "high"]),
    currentAlternatives: z.array(z.string()),
  }),
  marketReality: z.object({
    tamSamSom: z.string(),
    searchDemand: z.string(),
    trendMomentum: z.string(),
    oversaturationWarning: z.string(),
    competitorDensity: z.string(),
  }),
  competitors: z.array(finisherCompetitorSchema),

  // ── 4. EXECUTION MATERIALS ─────────────────────────────────────────
  opportunityWedge: z.object({
    underservedAudience: z.string(),
    ignoredWorkflow: z.string(),
    pricingGap: z.string(),
    uxGap: z.string(),
    aiLeverage: z.string(),
    speedAdvantage: z.string(),
  }),
  founderFit: z.object({
    skillsMatch: z.string(),
    difficulty: z.enum(["low", "medium", "high"]),
    buildTimeline: z.string(),
    technicalComplexity: z.string(),
  }),
  buildArtifacts: z.object({
    lovablePrompt: z.string(),
    v0Prompt: z.string(),
    cursorPrompt: z.string(),
    mvpFeatures: z.array(z.string()),
    dbSchema: z.string(),
    architecture: z.string(),
    authPayments: z.string(),
    landingCopy: z.string(),
    pricingIdeas: z.array(z.string()),
    onboardingFlow: z.string(),
    roadmap30Day: z.array(z.string()),
  }),
  validationPack: z.object({
    redditPostDraft: z.string(),
    twitterLaunchDraft: z.string(),
    landingPageCopy: z.string(),
    waitlistCopy: z.string(),
    interviewQuestions: z.array(z.string()),
    coldOutreachScript: z.string(),
    communityPlan: z.string(),
  }),
});

export type IdeaFinisher = z.infer<typeof ideaFinisherSchema>;
