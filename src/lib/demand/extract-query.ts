import { generateText } from "ai";
import { getLanguageModel } from "@/lib/ai/model";

export async function extractSearchQuery(topic: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: getLanguageModel(),
      system: "Extract 3-4 keywords to search Reddit, Hacker News, and GitHub for real user complaints about this problem. The search requires ALL keywords to appear in the same post, so fewer broader terms return more results — 3-4 is the limit. ALWAYS keep proper nouns, brand names, and domain-specific terms from the input (e.g. 'Netflix', 'Spotify', 'Shopify', 'React', 'Kubernetes') — these are the most valuable keywords. Then add specific nouns: industry, workflow, or technology terms someone frustrated with this problem would actually write in a forum post. Avoid ALL generic words: app, build, create, tool, platform, software, make, want, need, solution, service, system, product. Output ONLY the keywords space-separated, no punctuation, no explanation.",
      prompt: topic.slice(0, 600),
      maxOutputTokens: 20,
      temperature: 0.3,
    });
    const STRIP = new Set(["app","tool","platform","software","service","solution","system","product","build","create","make","want","need"]);
    const words = text.trim().replace(/[^a-z0-9\s]/gi, " ").split(/\s+/).filter(Boolean).filter(w => !STRIP.has(w.toLowerCase())).slice(0, 4);
    if (words.length > 0) return words.join(" ");
  } catch {
    // fall through to simple fallback
  }
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3)
    .join(" ");
}
