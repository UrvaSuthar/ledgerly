import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModel } from "ai"

// Provider resolution, in preference order:
//   1. Vercel AI Gateway — plain "anthropic/..." model string, best quality, scoped to this project
//   2. OpenRouter — same model catalogue, needs credit on the account
//   3. nothing — caller serves cached samples instead
//
// Deliberately NOT falling back to OpenRouter's ":free" models. They are shared, unmetered
// capacity: tested against a plain-text invoice, gemma-4-31b:free returned HTTP 429
// "rate-limited upstream" and dots-3-note-preview:free returned null content. A prospect who
// uploads a document and gets a 429 is a worse outcome than an honest "not configured" message.

export type Provider = "gateway" | "openrouter" | null

export function resolveProvider(): Provider {
  if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) return "gateway"
  if (process.env.OPENROUTER_API_KEY) return "openrouter"
  return null
}

const GATEWAY_MODEL = "anthropic/claude-sonnet-5"
// OpenRouter's catalogue lags the gateway's; 4.5 is the newest Sonnet reliably served there.
const OPENROUTER_MODEL = "anthropic/claude-sonnet-4.5"

export function getModel(provider: Exclude<Provider, null>): LanguageModel {
  if (provider === "gateway") return GATEWAY_MODEL

  const openrouter = createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
    headers: {
      // OpenRouter attributes usage to these; helps if the key is shared with other apps.
      "HTTP-Referer": "https://urvasuthar.in",
      "X-Title": "Ledgerly",
    },
  })
  return openrouter(OPENROUTER_MODEL)
}
