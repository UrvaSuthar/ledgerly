import { generateText, Output } from "ai"
import { invoiceSchema, checkArithmetic, type Invoice } from "@/lib/schema"
import { cachedResults } from "@/lib/cached"
import { samples } from "@/lib/samples"

// Fluid Compute / Node runtime — no reason to reach for edge here, and PDFs can be large.
export const maxDuration = 60

const MODEL = "anthropic/claude-sonnet-5"

const SYSTEM = `You extract structured data from invoices.

Rules:
- Transcribe only what is on the document. Never infer a value that is not there.
- Use null for anything genuinely absent. Do not guess, and do not substitute 0 for "missing" —
  a zero tax line and an absent tax line mean different things.
- Dates become ISO 8601 (YYYY-MM-DD). If a date is ambiguous (03/04/2026 could be either
  convention), pick the reading the document's origin makes most likely, and say so in warnings.
- If terms like "Net 30" are given without an explicit due date, compute the due date and note it.
- Amounts are plain numbers: no currency symbols, no thousands separators.
- Combine split tax components (CGST+SGST, state+county) into one taxAmount, and note the split.
- Use warnings for anything a human should verify before this is posted to a ledger:
  totals that disagree with line items, illegible values, ambiguous dates, missing parties.
  Be specific — "subtotal excludes shipping" beats "check the figures".`

function isConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.VERCEL_OIDC_TOKEN)
}

/** Arithmetic is verified locally rather than trusted to the model. */
function withLocalChecks(invoice: Invoice): Invoice {
  const found = checkArithmetic(invoice)
  if (!found.length) return invoice
  const existing = new Set(invoice.warnings)
  return { ...invoice, warnings: [...invoice.warnings, ...found.filter((w) => !existing.has(w))] }
}

export async function POST(req: Request) {
  let body: { text?: string; sampleId?: string; fileData?: string; mediaType?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 })
  }

  const { text, sampleId, fileData, mediaType } = body

  // No key configured: serve the precomputed sample so the demo still works, clearly labelled.
  if (!isConfigured()) {
    if (sampleId && cachedResults[sampleId]) {
      return Response.json({ invoice: withLocalChecks(cachedResults[sampleId]), mode: "cached" })
    }
    return Response.json(
      {
        error:
          "Live extraction needs an API key. Set AI_GATEWAY_API_KEY in the environment, or try one of the bundled samples.",
        mode: "unconfigured",
      },
      { status: 503 },
    )
  }

  const sampleText = sampleId ? samples.find((s) => s.id === sampleId)?.text : undefined
  const documentText = sampleText ?? text

  if (!documentText && !fileData) {
    return Response.json({ error: "Send some invoice text or a file." }, { status: 400 })
  }

  const content: Array<Record<string, unknown>> = [
    { type: "text", text: "Extract this invoice." },
  ]
  if (fileData) {
    content.push({ type: "file", data: fileData, mediaType: mediaType ?? "application/pdf" })
  } else {
    content.push({ type: "text", text: documentText! })
  }

  try {
    const { output } = await generateText({
      model: MODEL,
      system: SYSTEM,
      output: Output.object({ schema: invoiceSchema }),
      messages: [{ role: "user", content: content as never }],
    })

    return Response.json({ invoice: withLocalChecks(output as Invoice), mode: "live" })
  } catch (err) {
    console.error("extraction failed:", err)
    // Fall back to the cached sample rather than showing a stranger an error page.
    if (sampleId && cachedResults[sampleId]) {
      return Response.json({ invoice: withLocalChecks(cachedResults[sampleId]), mode: "cached" })
    }
    const message = err instanceof Error ? err.message : "Extraction failed."
    return Response.json({ error: message }, { status: 500 })
  }
}
