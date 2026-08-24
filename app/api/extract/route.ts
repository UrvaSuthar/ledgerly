import { generateText, Output } from "ai"
import { invoiceSchema, checkArithmetic, type Invoice } from "@/lib/schema"
import { cachedResults } from "@/lib/cached"
import { resolveProvider, getModel } from "@/lib/model"

export const maxDuration = 60

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

// ponytail: in-memory per-IP limit, no Redis. Ceiling: it is per-instance, so under heavy
// concurrency the effective limit is higher than MAX. That is fine for a portfolio demo —
// its job is to stop one person looping the endpoint and draining the API credit, not to be
// an airtight quota. Swap for Vercel KV if this ever matters commercially.
const WINDOW_MS = 60 * 60 * 1000
const MAX = 8
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear() // crude unbounded-growth guard
  return false
}

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

  // Samples ALWAYS come from cache, even when a key is configured. They are fixed documents
  // with known-correct output, so a live call would spend credit to reproduce a result we
  // already have — and would expose the demo's main interaction to model flakiness. The
  // arithmetic checker still runs over them, so the validation on display is genuinely live.
  if (sampleId) {
    const hit = cachedResults[sampleId]
    if (!hit) return Response.json({ error: "Unknown sample." }, { status: 404 })
    return Response.json({ invoice: withLocalChecks(hit), mode: "cached" })
  }

  if (!text?.trim() && !fileData) {
    return Response.json({ error: "Send some invoice text or a file." }, { status: 400 })
  }

  const provider = resolveProvider()
  if (!provider) {
    return Response.json(
      {
        error:
          "Live extraction isn't configured on this deployment. The three samples on the left still work — they show the same validation running on known documents.",
        mode: "unconfigured",
      },
      { status: 503 },
    )
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (rateLimited(ip)) {
    return Response.json(
      { error: `Rate limit reached — ${MAX} documents an hour. Try one of the samples instead.` },
      { status: 429 },
    )
  }

  const content: Array<Record<string, unknown>> = [{ type: "text", text: "Extract this invoice." }]
  if (fileData) {
    content.push({ type: "file", data: fileData, mediaType: mediaType ?? "application/pdf" })
  } else {
    content.push({ type: "text", text: text! })
  }

  try {
    const { output } = await generateText({
      model: getModel(provider),
      system: SYSTEM,
      output: Output.object({ schema: invoiceSchema }),
      messages: [{ role: "user", content: content as never }],
    })
    return Response.json({ invoice: withLocalChecks(output as Invoice), mode: "live", provider })
  } catch (err) {
    console.error("extraction failed:", err)
    const raw = err instanceof Error ? err.message : ""
    // Credit exhaustion and upstream rate limits are the two realistic failures here, and a
    // generic "extraction failed" would leave the operator guessing which.
    const message = /402|credit|quota|insufficient/i.test(raw)
      ? "The extraction provider is out of credit."
      : /429|rate.?limit/i.test(raw)
        ? "The extraction provider is rate-limiting requests. Try again shortly."
        : "Couldn't read that document. Try the samples, or a clearer scan."
    return Response.json({ error: message }, { status: 502 })
  }
}
