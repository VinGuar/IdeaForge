import { z } from "zod";

export const urgencyLevelSchema = z.enum(["low", "medium", "high"]);
export const frustrationLevelSchema = z.enum(["low", "medium", "high"]);
export const warningSeveritySchema = z.enum(["info", "warning", "critical"]);

export const demandSignalSchema = z.object({
  source: z.string(),
  excerpt: z.string(),
  url: z.string().nullable(),
  painThemes: z.array(z.string()),
  wtpSignal: z.boolean(),
  frustration: frustrationLevelSchema,
});

export const competitorSchema = z.object({
  name: z.string(),
  url: z.string().nullable(),
  pricing: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  commonComplaints: z.array(z.string()),
  sentiment: z.string(),
});

export const dontBuildWarningSchema = z.object({
  severity: warningSeveritySchema,
  title: z.string(),
  detail: z.string(),
});

export const checklistItemSchema = z.object({
  item: z.string(),
  done: z.boolean().nullable(),
});

export const painClusterSchema = z.object({
  theme: z.string(),
  evidenceSnippets: z.array(z.string()),
  opportunityHypothesis: z.string(),
});

export const validationQualitySchema = z.object({
  buildGateScore: z.number().min(0).max(100),
  reasons: z.array(z.string()),
});

export const probabilityScoreExplanationsSchema = z.object({
  monetizationPotential: z.string(),
  easeOfAcquisition: z.string(),
  competitionIntensity: z.string(),
  aiDefensibility: z.string(),
  mvpFeasibility: z.string(),
  speedToRevenue: z.string(),
  soloFounderViability: z.string(),
});

export const ideaReportSchema = z.object({
  title: z.string(),
  oneLiner: z.string(),
  dataRetrievalNote: z.string(),
  validationQuality: validationQualitySchema,
  painClusters: z.array(painClusterSchema),
  demandSignalsSummary: z.array(demandSignalSchema),
  problemAnalysis: z.object({
    customerPain: z.string(),
    whoExperiences: z.string(),
    frequency: z.string(),
    urgency: urgencyLevelSchema,
    currentAlternatives: z.array(z.string()),
  }),
  marketReality: z.object({
    tamSamSom: z.string(),
    searchDemand: z.string(),
    trendMomentum: z.string(),
    oversaturationWarning: z.string(),
    competitorDensity: z.string(),
  }),
  competitors: z.array(competitorSchema),
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
    difficulty: urgencyLevelSchema,
    buildTimeline: z.string(),
    technicalComplexity: z.string(),
  }),
  probabilityScores: z.object({
    monetizationPotential: z.number().min(0).max(100),
    easeOfAcquisition: z.number().min(0).max(100),
    competitionIntensity: z.number().min(0).max(100),
    aiDefensibility: z.number().min(0).max(100),
    mvpFeasibility: z.number().min(0).max(100),
    speedToRevenue: z.number().min(0).max(100),
    soloFounderViability: z.number().min(0).max(100),
  }),
  probabilityScoreExplanations: probabilityScoreExplanationsSchema,
  dontBuildWarnings: z.array(dontBuildWarningSchema),
  validationPack: z.object({
    redditPostDraft: z.string(),
    twitterLaunchDraft: z.string(),
    landingPageCopy: z.string(),
    waitlistCopy: z.string(),
    interviewQuestions: z.array(z.string()),
    surveyOutline: z.array(z.string()),
    coldOutreachScript: z.string(),
    communityPlan: z.string(),
  }),
  validationChecklist: z.array(checklistItemSchema),
  weakDemandSignals: z.array(z.string()),
  buildArtifacts: z.object({
    lovablePrompt: z.string(),
    v0Prompt: z.string(),
    cursorPrompt: z.string(),
    mvpFeatures: z.array(z.string()),
    dbSchema: z.string(),
    architecture: z.string(),
    authPayments: z.string(),
    aiApis: z.array(z.string()),
    integrations: z.array(z.string()),
    landingCopy: z.string(),
    pricingIdeas: z.array(z.string()),
    onboardingFlow: z.string(),
    roadmap30Day: z.array(z.string()),
  }),
});

export type IdeaReport = z.infer<typeof ideaReportSchema>;
export type DemandSignalRow = z.infer<typeof demandSignalSchema>;
