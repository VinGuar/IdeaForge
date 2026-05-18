import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { getLanguageModel } from "@/lib/ai/model";
import { REFINER_SYSTEM } from "@/lib/ai/prompts";

export const maxDuration = 120;

type ChatBody = {
  messages?: UIMessage[];
  reportSnapshot?: unknown;
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

    const stripped = messages.map(({ id, ...rest }) => {
      void id;
      return rest;
    });

    const modelMessages = await convertToModelMessages(stripped);

    const snapshot =
      body.reportSnapshot != null
        ? `\n\nCURRENT REPORT SNAPSHOT (trust but verify with user):\n${JSON.stringify(body.reportSnapshot).slice(0, 28000)}`
        : "";

    const result = streamText({
      model,
      system: REFINER_SYSTEM + snapshot,
      messages: modelMessages,
      temperature: 1,
    });

    return result.toUIMessageStreamResponse();
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Chat failed." }, { status: 500 });
  }
}
