import { streamObject } from "ai";
import { gatherDemandSnippets, snippetsToPromptDigest } from "@/lib/demand/gather";
import { getLanguageModel } from "@/lib/ai/model";
import { DISCOVER_SYSTEM, buildDiscoverPrompt } from "@/lib/ai/prompts";
import { ideaDiscoverySchema } from "@/lib/schemas/idea-discovery";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      niche?: string;
      digest?: string;
    };

    const niche = String(body.niche ?? "").trim();

    let digest: string;
    let gatherErrorsBlock = "";

    if (body.digest && body.digest.trim().length > 0) {
      digest = body.digest;
    } else {
      const searchQuery = niche
        ? `${niche} pain problem frustration`
        : "startup pain points software problems";
      console.log(`[discover] niche="${niche}" → query="${searchQuery}"`);
      const { snippets, errors } = await gatherDemandSnippets(searchQuery);
      digest = snippetsToPromptDigest(snippets);
      if (errors.length) {
        gatherErrorsBlock = `\n\nINGESTION NOTES:\n${errors.map((e) => `- ${e}`).join("\n")}`;
      }
    }

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
      schema: ideaDiscoverySchema,
      system: DISCOVER_SYSTEM,
      prompt: buildDiscoverPrompt({ niche, digest, gatherErrorsBlock }),
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Discover failed." }, { status: 500 });
  }
}
