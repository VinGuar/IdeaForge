import { z } from "zod";

export const discoveryIdeaSchema = z.object({
  title: z.string(),
  oneLiner: z.string(),
  targetAudience: z.string(),
  coreWedge: z.string(),
  opportunityScore: z.number(),
  firstValidationStep: z.string(),
  tags: z.array(z.string()),
});

export const ideaDiscoverySchema = z.object({
  ideas: z.array(discoveryIdeaSchema),
  searchContext: z.string(),
});

export type DiscoveryIdea = z.infer<typeof discoveryIdeaSchema>;
export type IdeaDiscovery = z.infer<typeof ideaDiscoverySchema>;
