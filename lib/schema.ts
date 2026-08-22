import { z } from "zod"

// Nullable rather than optional throughout: the model must actively say "this field
// isn't on the document" instead of silently omitting it. A missing due date and an
// invisible one are very different things to an accounts team.
const money = z.number().nullable().describe("Numeric amount only, no currency symbol or thousands separators")

export const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable(),
  unitPrice: money,
  amount: money,
})

export const invoiceSchema = z.object({
  vendor: z.object({
    name: z.string().nullable(),
    address: z.string().nullable(),
    taxId: z.string().nullable().describe("GSTIN, VAT number, ABN, EIN — whatever the document uses"),
    email: z.string().nullable(),
  }),
  billTo: z.object({
    name: z.string().nullable(),
    address: z.string().nullable(),
  }),
  invoiceNumber: z.string().nullable(),
  issueDate: z.string().nullable().describe("ISO 8601 (YYYY-MM-DD). Convert from whatever format the document uses."),
  dueDate: z.string().nullable().describe("ISO 8601 (YYYY-MM-DD). If stated as terms like 'Net 30', compute it from the issue date."),
  currency: z.string().nullable().describe("ISO 4217 code, e.g. INR, USD, EUR, AED"),
  lineItems: z.array(lineItemSchema),
  subtotal: money,
  taxAmount: money,
  taxRate: z.number().nullable().describe("Percentage as a number, e.g. 18 for 18%"),
  total: money,
  // The honest part. An extractor that never flags anything is not trustworthy —
  // real documents are smudged, cropped, ambiguous, and sometimes internally inconsistent.
  warnings: z
    .array(z.string())
    .describe(
      "Anything a human should check: illegible values, a total that doesn't match the line items, " +
      "ambiguous date formats (03/04/2026 is genuinely ambiguous), missing tax breakdown. Empty array if clean.",
    ),
})

export type Invoice = z.infer<typeof invoiceSchema>
export type LineItem = z.infer<typeof lineItemSchema>

/** Does the arithmetic on the document actually add up? Checked locally, not by the model. */
export function checkArithmetic(inv: Invoice): string[] {
  const issues: string[] = []
  const sum = inv.lineItems.reduce((acc, li) => acc + (li.amount ?? 0), 0)

  if (inv.subtotal != null && inv.lineItems.length > 0 && Math.abs(sum - inv.subtotal) > 0.02) {
    issues.push(`Line items sum to ${sum.toFixed(2)} but subtotal reads ${inv.subtotal.toFixed(2)}`)
  }
  if (inv.subtotal != null && inv.taxAmount != null && inv.total != null) {
    const expected = inv.subtotal + inv.taxAmount
    if (Math.abs(expected - inv.total) > 0.02) {
      issues.push(`Subtotal plus tax is ${expected.toFixed(2)} but total reads ${inv.total.toFixed(2)}`)
    }
  }
  if (inv.issueDate && inv.dueDate && inv.dueDate < inv.issueDate) {
    issues.push("Due date falls before the issue date")
  }
  return issues
}
