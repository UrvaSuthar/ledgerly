# Ledgerly

Turn an invoice — PDF, photo, or pasted text — into structured, validated data.

**Live demo:** https://ledgerly-pi-eight.vercel.app

Most extraction tools hand back confident JSON and leave you to discover the mistakes at
reconciliation time. Ledgerly does two things differently:

- **It flags what it isn't sure about.** Ambiguous dates (`03/04/2026` is genuinely
  ambiguous), missing parties, split tax components, terms like "Net 30" that imply a due
  date rather than stating one — all surfaced as warnings instead of silently guessed.
- **It re-does the arithmetic itself.** Line items are summed, tax is checked against the
  subtotal, and dates are sanity-checked in application code, not trusted to the model. On
  the bundled "broken maths" sample this catches a €50 discrepancy the document hides.

## How it works

| | |
|---|---|
| Model | `anthropic/claude-sonnet-5` via Vercel AI Gateway |
| Structured output | AI SDK v7 `generateText` + `Output.object` against a Zod schema |
| Validation | `lib/schema.ts` — arithmetic and date checks run locally, after extraction |
| Runtime | Next.js 16 App Router, Node runtime on Fluid Compute |

Every field is `nullable` rather than optional by design: the model has to actively report
that something is absent from the document instead of quietly omitting it. A zero tax line
and a missing tax line mean different things to an accounts team.

## Running it

```bash
npm install
echo "AI_GATEWAY_API_KEY=your_key" > .env.local
npm run dev
```

Without a key the three bundled samples still return precomputed results, labelled `cached`
in the UI. That's deliberate — a demo that 500s in front of someone is worse than no demo —
but it is never presented as a live model call.

## Layout

```
app/
  page.tsx              UI — samples, paste, upload, results, CSV export
  api/extract/route.ts  extraction endpoint, degrades to cached on failure
lib/
  schema.ts             Zod schema + local arithmetic validation
  samples.ts            three sample invoices, each flawed differently
  cached.ts             precomputed results for the no-key path
```

The samples aren't clean documents. One is a standard Indian GST invoice with a CGST/SGST
split, one has a date no parser can disambiguate without knowing the vendor's country, and
one contains a subtotal that contradicts its own line items. An extractor that only handles
tidy input demonstrates nothing.

## Built by

[Urva Suthar](https://urva.vercel.app) — full-stack developer working
on fintech and B2B SaaS. Available for freelance projects.
