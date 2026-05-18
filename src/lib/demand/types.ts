export type DemandSourceKind =
  | "reddit"
  | "hackernews"
  | "github"
  | "stackoverflow"
  | "producthunt"
  | "indiehackers"
  | "manual";

export type RawDemandSnippet = {
  source: DemandSourceKind;
  title?: string;
  text: string;
  url?: string;
  score?: number;
};
