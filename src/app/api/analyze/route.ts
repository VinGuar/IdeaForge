import { generateText, streamObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { gatherDemandSnippets, snippetsToPromptDigest } from "@/lib/demand/gather";
import { getLanguageModel } from "@/lib/ai/model";
import { ANALYST_SYSTEM, buildAnalystPrompt } from "@/lib/ai/prompts";
import { ideaReportSchema } from "@/lib/schemas/idea-report";

export const maxDuration = 120;

async function extractSearchQuery(topic: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: "Extract 3-4 keywords to search Reddit, Hacker News, and GitHub for real user complaints about this problem. The search requires ALL keywords to appear in the same post, so fewer broader terms return more results — 3-4 is the limit. Pick specific nouns: industry, workflow, or technology terms someone frustrated with this problem would actually write in a forum post. Avoid generic words like build, create, tool, platform, software, make, want, need, solution. Output ONLY the keywords space-separated, no punctuation, no explanation.",
      prompt: topic.slice(0, 600),
      maxOutputTokens: 20,
      temperature: 1,
    });
    const words = text.trim().replace(/[^a-z0-9\s]/gi, " ").split(/\s+/).filter(Boolean).slice(0, 4);
    if (words.length > 0) return words.join(" ");
  } catch {
    // fall through to simple fallback
  }
  // Fallback: take first 3 meaningful words
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3)
    .join(" ");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      topic?: string;
      founderProfile?: string;
      pastedSignals?: string;
      digest?: string;
    };

    const topic = String(body.topic ?? "").trim();
    if (!topic) {
      return Response.json({ error: "Topic is required." }, { status: 400 });
    }

    const founderProfile = body.founderProfile ? String(body.founderProfile) : "";
    const pastedSignals = body.pastedSignals ? String(body.pastedSignals) : "";

    // Use client-prefetched digest if provided, otherwise gather server-side as fallback.
    let digest: string;
    let gatherErrorsBlock = "";

    if (body.digest && body.digest.trim().length > 0) {
      digest = body.digest;
    } else {
      const searchQuery = await extractSearchQuery(topic);
      console.log(`[analyze] topic="${topic.slice(0, 80)}…" → query="${searchQuery}"`);
      const { snippets, errors } = await gatherDemandSnippets(searchQuery);
      digest = snippetsToPromptDigest(snippets);
      if (errors.length) {
        gatherErrorsBlock = `\n\nINGESTION NOTES:\n${errors.map((e) => `- ${e}`).join("\n")}`;
      }
    }

    const manualBlock = pastedSignals.trim()
      ? `\n\nUSER-PASTED RAW SIGNALS / NOTES:\n${pastedSignals.trim().slice(0, 12000)}`
      : "";

    let model;
    try {
      model = getLanguageModel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Model configuration error.";
      return Response.json(
        { error: msg, hint: "Set OPENAI_API_KEY in .env" },
        { status: 503 },
      );
    }

    const result = streamObject({
      model,
      schema: ideaReportSchema,
      system: ANALYST_SYSTEM,
      prompt: buildAnalystPrompt({ topic, founderProfile, digest, manualBlock, gatherErrorsBlock }),
      temperature: 1,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Analyze failed." }, { status: 500 });
  }
}
