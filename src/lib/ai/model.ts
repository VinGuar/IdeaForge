import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export function getLanguageModel(): LanguageModel {
  const provider = process.env.IDEAFORGE_LLM_PROVIDER ?? "openai";

  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY is not set.");
    }
    const id =
      process.env.IDEAFORGE_ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
    return anthropic(id);
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  const id = process.env.IDEAFORGE_OPENAI_MODEL ?? "gpt-4o-mini";
  return openai(id);
}
