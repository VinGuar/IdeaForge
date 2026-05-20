import { z } from "zod";

export const warningSeveritySchema = z.enum(["info", "warning", "critical"]);

export const dontBuildWarningSchema = z.object({
  severity: warningSeveritySchema,
  title: z.string(),
  detail: z.string(),
});

export const topSignalSchema = z.object({
  observation: z.string(),
  strength: z.enum(["strong", "moderate", "weak"]),
  wtpEvidence: z.boolean(),
});

// Verdict-focused validation report.
// Answers ONLY: "Is this raw idea fundamentally promising?"
// Everything execution-related (MVP, GTM, positioning, monetization strategy) lives in Idea Finisher.
export const ideaReportSchema = z.object({
  title: z.string(),
  oneLiner: z.string(),
  dataRetrievalNote: z.string(),
  validationQuality: z.object({
    buildGateScore: z.number().min(0).max(100),
    verdict: z.string(),
    summary: z.string(),
    reasons: z.array(z.string()),
  }),
  dontBuildWarnings: z.array(dontBuildWarningSchema),
  probabilityScores: z.object({
    monetizationPotential: z.number().min(0).max(100),
    easeOfAcquisition: z.number().min(0).max(100),
    competitionIntensity: z.number().min(0).max(100),
    founderViability: z.number().min(0).max(100),
  }),
  probabilityScoreExplanations: z.object({
    monetizationPotential: z.string(),
    easeOfAcquisition: z.string(),
    competitionIntensity: z.string(),
    founderViability: z.string(),
  }),
  topSignals: z.array(topSignalSchema),
  weakDemandSignals: z.array(z.string()),
});

export type IdeaReport = z.infer<typeof ideaReportSchema>;
export type TopSignal = z.infer<typeof topSignalSchema>;
