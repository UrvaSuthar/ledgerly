import type { Invoice } from "./schema"

// Precomputed extractions for the bundled samples.
//
// Why these exist: without an API key the app would 500 on every request, and a portfolio
// demo that errors in front of a prospect is worse than no demo at all. With no key set,
// sample requests return these and the UI labels them "cached" — clearly, not passed off
// as a live model call. Uploads still require a real key, because there is nothing honest
// to return for a document nobody has seen.
export const cachedResults: Record<string, Invoice> = {
  "gst-india": {
    vendor: {
      name: "Meridian Software Labs Pvt Ltd",
      address: "404, Sun Avenue One, Manekbag, Ahmedabad, Gujarat 380015",
      taxId: "24AAGCM1234K1ZP",
      email: "accounts@meridianlabs.in",
    },
    billTo: {
      name: "Kestrel Retail Ventures LLP",
      address: "2nd Floor, Corporate House, Prahladnagar, Ahmedabad, Gujarat 380051",
    },
    invoiceNumber: "MSL/2026-27/0148",
    issueDate: "2026-08-04",
    dueDate: "2026-09-03",
    currency: "INR",
    lineItems: [
      { description: "Backend API development (Aug 2026 sprint)", quantity: 80, unitPrice: 1500, amount: 120000 },
      { description: "Database migration & tuning", quantity: 16, unitPrice: 1800, amount: 28800 },
      { description: "Deployment / DevOps support", quantity: 6, unitPrice: 1500, amount: 9000 },
    ],
    subtotal: 157800,
    taxAmount: 28404,
    taxRate: 18,
    total: 186204,
    warnings: [
      "Tax is split as CGST 9% + SGST 9%; combined here as 18%. Intra-state supply under Indian GST.",
      "Due date derived from 'Net 30' terms, not printed on the document.",
    ],
  },
  "us-net15": {
    vendor: {
      name: "Northgate Analytics Inc.",
      address: "1200 Harrison Street, Suite 410, San Francisco, CA 94103",
      taxId: "84-3921055",
      email: null,
    },
    billTo: { name: "Aperture Logistics Co.", address: "88 Wharf Road, Oakland, CA 94607" },
    invoiceNumber: "NG-4471",
    issueDate: "2026-03-04",
    dueDate: "2026-03-19",
    currency: "USD",
    lineItems: [
      { description: "Data pipeline consulting (24 hrs @ $145)", quantity: 24, unitPrice: 145, amount: 3480 },
      { description: "Dashboard build — fixed fee", quantity: null, unitPrice: null, amount: 6200 },
      { description: "Onboarding session", quantity: null, unitPrice: null, amount: 450 },
    ],
    subtotal: 10130,
    taxAmount: 0,
    taxRate: 0,
    total: 10130,
    warnings: [
      "Date '03/04/2026' is ambiguous. Read as 3 April 2026 (day/month) — but a US vendor more likely means 4 March 2026. Confirm before posting.",
      "Due date computed from 'Net 15' against the assumed issue date, so it inherits the same ambiguity.",
    ],
  },
  "broken-maths": {
    vendor: {
      name: "Havenlight Studio BV",
      address: "Keizersgracht 241, 1016 EA Amsterdam, Netherlands",
      taxId: "NL814266392B01",
      email: null,
    },
    billTo: { name: null, address: null },
    invoiceNumber: "HL-2026-0912",
    issueDate: "2026-08-11",
    dueDate: "2026-09-10",
    currency: "EUR",
    lineItems: [
      { description: "Brand identity system", quantity: null, unitPrice: null, amount: 2400 },
      { description: "Web design, 6 templates", quantity: null, unitPrice: null, amount: 3600 },
      { description: "Motion assets", quantity: null, unitPrice: null, amount: 950 },
    ],
    subtotal: 6900,
    taxAmount: 1459.5,
    taxRate: 21,
    total: 8359.5,
    warnings: [
      "No bill-to party printed on the document.",
      "VAT of 1,459.50 is 21% of 6,950 — not of the stated 6,900 subtotal. The subtotal looks like the typo.",
    ],
  },
}
