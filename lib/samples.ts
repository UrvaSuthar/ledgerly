// Bundled samples so a visitor can see the thing work in one click, with no upload
// and no account. Each one is deliberately imperfect in a different way, because an
// extractor that only handles clean documents demonstrates nothing.
export const samples = [
  {
    id: "gst-india",
    label: "Indian GST invoice",
    hint: "Clean document, 18% GST, INR",
    text: `TAX INVOICE

Meridian Software Labs Pvt Ltd
404, Sun Avenue One, Manekbag
Ahmedabad, Gujarat 380015
GSTIN: 24AAGCM1234K1ZP
accounts@meridianlabs.in

Invoice No: MSL/2026-27/0148
Invoice Date: 04/08/2026
Payment Terms: Net 30

Bill To:
Kestrel Retail Ventures LLP
2nd Floor, Corporate House, Prahladnagar
Ahmedabad, Gujarat 380051

--------------------------------------------------------
Description                    Qty    Rate      Amount
--------------------------------------------------------
Backend API development         80    1,500    120,000.00
  (Aug 2026 sprint)
Database migration & tuning     16    1,800     28,800.00
Deployment / DevOps support      6    1,500      9,000.00
--------------------------------------------------------
                            Subtotal            157,800.00
                            CGST @ 9%            14,202.00
                            SGST @ 9%            14,202.00
                            TOTAL               186,204.00

Amount in words: One Lakh Eighty Six Thousand Two Hundred Four Only`,
  },
  {
    id: "us-net15",
    label: "US invoice, ambiguous date",
    hint: "03/04/2026 — March or April? Should be flagged",
    text: `INVOICE

Northgate Analytics Inc.
1200 Harrison Street, Suite 410
San Francisco, CA 94103
EIN: 84-3921055

Invoice #: NG-4471
Date: 03/04/2026
Terms: Net 15

BILL TO
Aperture Logistics Co.
88 Wharf Road, Oakland, CA 94607

ITEM                                              AMOUNT
Data pipeline consulting (24 hrs @ $145)        $3,480.00
Dashboard build — fixed fee                     $6,200.00
Onboarding session                                $450.00

                                    Subtotal    $10,130.00
                                    Sales tax        $0.00
                                    TOTAL       $10,130.00

Wire instructions on file. Late payments accrue 1.5% monthly.`,
  },
  {
    id: "broken-maths",
    label: "Invoice that doesn't add up",
    hint: "Subtotal contradicts the line items — the check should catch it",
    text: `INVOICE / FACTURE

Havenlight Studio BV
Keizersgracht 241
1016 EA Amsterdam, Netherlands
VAT: NL814266392B01

Invoice number: HL-2026-0912
Issued: 2026-08-11
Due: 2026-09-10
Currency: EUR

Services
  Brand identity system              2,400.00
  Web design, 6 templates            3,600.00
  Motion assets                        950.00

  Subtotal                           6,900.00
  VAT 21%                            1,459.50
  Total due                          8,359.50

Please reference the invoice number with payment.`,
  },
] as const

export type Sample = (typeof samples)[number]
