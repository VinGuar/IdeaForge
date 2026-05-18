import { fetchHnCommentSignals } from "./hackernews";
import { fetchRedditSignals } from "./reddit";
import { fetchGithubSignals } from "./github";
import { fetchStackOverflowSignals } from "./stackoverflow";
import type { RawDemandSnippet } from "./types";

export async function gatherDemandSnippets(topic: string): Promise<{
  snippets: RawDemandSnippet[];
  errors: string[];
}> {
  const errors: string[] = [];

  const [reddit, hn, github, stackoverflow] = await Promise.all([
    fetchRedditSignals(topic),
    fetchHnCommentSignals(topic),
    fetchGithubSignals(topic),
    fetchStackOverflowSignals(topic),
  ]);

  console.log(`[signals] reddit=${reddit.length} hn=${hn.length} github=${github.length} so=${stackoverflow.length}`);

  if (reddit.length === 0) {
    errors.push("Reddit returned no snippets (rate limit, block, or niche query).");
  }
  if (hn.length === 0) {
    errors.push("Hacker News Algolia returned no comment hits for this query.");
  }
  if (github.length === 0) {
    errors.push("GitHub Issues returned no results (rate limit or niche query).");
  }
  if (stackoverflow.length === 0) {
    errors.push("Stack Overflow returned no results for this query.");
  }

  const snippets = [...reddit, ...hn, ...github, ...stackoverflow];
  const deduped = dedupeSnippets(snippets);

  return { snippets: deduped.slice(0, 70), errors };
}

function normalizeForDedupe(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .slice(0, 280);
}

function dedupeSnippets(items: RawDemandSnippet[]): RawDemandSnippet[] {
  const seen = new Set<string>();
  const out: RawDemandSnippet[] = [];
  for (const item of items) {
    const key = normalizeForDedupe(item.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function snippetsToPromptDigest(snippets: RawDemandSnippet[]): string {
  if (snippets.length === 0) {
    return "NO LIVE SNIPPETS were retrieved. Clearly state low confidence, widen the query, and instruct the user to paste URLs, screenshots, or raw complaints.";
  }

  return snippets
    .map((s, i) => {
      const head = `[${i + 1}] ${s.source}${s.title ? ` — ${s.title}` : ""}${s.url ? ` (${s.url})` : ""}`;
      return `${head}\n${s.text}`;
    })
    .join("\n\n---\n\n");
}
