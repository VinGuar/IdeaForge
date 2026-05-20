import { z } from "zod";

export const founderFitScoreSchema = z.object({
  skillMatch:            z.number().min(1).max(10),
  distributionAdvantage: z.number().min(1).max(10),
  executionSpeed:        z.number().min(1).max(10),
  monetizationFit:       z.number().min(1).max(10),
});

export const discoveryIdeaSchema = z.object({
  title:               z.string(),
  oneLiner:            z.string(),
  targetAudience:      z.string(),
  coreWedge:           z.string(),
  firstValidationStep: z.string(),
  whyYou:              z.string(),
  whyNow:              z.string(),
  monetizationPath:    z.string(),
  founderFitScore:     founderFitScoreSchema,
  opportunityScore:    z.number().min(0).max(100),
  tags:                z.array(z.string()),
});

export const opportunityZoneSchema = z.object({
  zone:          z.string(),
  zoneRationale: z.string(),
  ideas:         z.array(discoveryIdeaSchema),
});

export const ideaDiscoverySchema = z.object({
  founderSummary: z.object({
    role:                   z.string(),
    skills:                 z.array(z.string()),
    interests:              z.array(z.string()),
    keyAdvantages:          z.array(z.string()),
    monetizationPreference: z.string(),
  }),
  opportunityZones: z.array(opportunityZoneSchema),
  searchContext:    z.string(),
});

export type DiscoveryIdea   = z.infer<typeof discoveryIdeaSchema>;
export type OpportunityZone = z.infer<typeof opportunityZoneSchema>;
export type IdeaDiscovery   = z.infer<typeof ideaDiscoverySchema>;
