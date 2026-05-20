import { streamText, Output } from "ai";
import { getLanguageModel } from "@/lib/ai/model";
import { DISCOVER_SYSTEM, buildDiscoverPrompt } from "@/lib/ai/prompts";
import { ideaDiscoverySchema } from "@/lib/schemas/idea-discovery";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      niche?: string;
      founderProfileText?: string;
    };

    const niche = String(body.niche ?? "").trim().slice(0, 2000);
    const founderProfileText = body.founderProfileText ? String(body.founderProfileText).slice(0, 2000) : undefined;

    if (!niche && !founderProfileText) {
      return Response.json({ error: "Provide a niche or complete your founder profile." }, { status: 400 });
    }

    let model;
    try {
      model = getLanguageModel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Model configuration error.";
      return Response.json({ error: msg }, { status: 503 });
    }

    const result = streamText({
      model,
      output: Output.object({ schema: ideaDiscoverySchema }),
      system: DISCOVER_SYSTEM,
      prompt: buildDiscoverPrompt({ niche, founderProfileText }),
      temperature: 1,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Discover failed." }, { status: 500 });
  }
}
