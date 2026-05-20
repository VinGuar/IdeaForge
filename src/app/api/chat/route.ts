import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { getLanguageModel } from "@/lib/ai/model";
import { CREATOR_SYSTEM, FINISHER_SYSTEM, REFINER_SYSTEM } from "@/lib/ai/prompts";

export const maxDuration = 120;

const CONTEXT_WINDOW = 8;  // messages sent to AI (trims old history)
const MAX_OUTPUT = 600;    // tokens per response

type ChatBody = {
  messages?: UIMessage[];
  reportSnapshot?: unknown;
  chatMode?: "create" | "validate" | "finish";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatBody;
    const messages = body.messages ?? [];

    let model;
    try {
      model = getLanguageModel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Model configuration error.";
      return Response.json(
        {
          error: msg,
          hint: "Set OPENAI_API_KEY or ANTHROPIC_API_KEY and optionally IDEAFORGE_LLM_PROVIDER.",
        },
        { status: 503 },
      );
    }

    // Keep only the most recent messages to limit context size and cost.
    const trimmed = messages.slice(-CONTEXT_WINDOW);
    const modelMessages = await convertToModelMessages(trimmed);

    const snapshot =
      body.reportSnapshot != null
        ? `\n\nCURRENT REPORT SNAPSHOT (trust but verify with user):\n${JSON.stringify(body.reportSnapshot).slice(0, 28000)}`
        : "";

    const systemPrompt =
      body.chatMode === "create"
        ? CREATOR_SYSTEM + snapshot        // snapshot carries selectedDiscoveryIdea when set
        : body.chatMode === "finish"
          ? FINISHER_SYSTEM + snapshot
          : REFINER_SYSTEM + snapshot;

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      temperature: 1,
      maxOutputTokens: MAX_OUTPUT,
    });

    return result.toUIMessageStreamResponse();
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Chat failed." }, { status: 500 });
  }
}
