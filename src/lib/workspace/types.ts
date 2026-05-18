import type { IdeaReport } from "@/lib/schemas/idea-report";

export type ForgeThread = {
  id: string;
  title: string;
  updatedAt: number;
  topic: string;
  founderProfile: string;
  pastedSignals: string;
  favorite?: boolean;
  report?: IdeaReport | null;
};
