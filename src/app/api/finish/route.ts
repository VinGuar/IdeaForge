import { streamText, Output } from "ai";
import { gatherDemandSnippets, snippetsToPromptDigest } from "@/lib/demand/gather";
import { extractSearchQuery } from "@/lib/demand/extract-query";
import { getLanguageModel } from "@/lib/ai/model";
import { FINISHER_GENERATOR_SYSTEM, buildFinisherPrompt } from "@/lib/ai/prompts";
import { ideaFinisherSchema } from "@/lib/schemas/idea-finisher";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      topic?: string;
      founderProfile?: string;
      report?: unknown;
    };

    const topic = String(body.topic ?? "").trim().slice(0, 2000);
    if (!topic) {
      return Response.json({ error: "Topic is required." }, { status: 400 });
    }

    let model;
    try {
      model = getLanguageModel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Model configuration error.";
      return Response.json({ error: msg }, { status: 503 });
    }

    const searchQuery = await extractSearchQuery(topic);
    console.log(`[finish] topic="${topic.slice(0, 80)}…" → query="${searchQuery}"`);

    const { snippets, errors } = await gatherDemandSnippets(searchQuery);
    const digest = snippetsToPromptDigest(snippets);
    const gatherErrorsBlock = errors.length
      ? `\n\nINGESTION NOTES:\n${errors.map((e) => `- ${e}`).join("\n")}`
      : "";

    const result = streamText({
      model,
      output: Output.object({ schema: ideaFinisherSchema }),
      system: FINISHER_GENERATOR_SYSTEM,
      prompt: buildFinisherPrompt({
        topic,
        founderProfile: body.founderProfile ? String(body.founderProfile).slice(0, 2000) : undefined,
        report: body.report,
        digest,
        gatherErrorsBlock,
      }),
      temperature: 0.6,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Blueprint generation failed." }, { status: 500 });
  }
}
