"use client"

import { useState, useRef } from "react"
import { samples } from "@/lib/samples"
import type { Invoice } from "@/lib/schema"

type Mode = "live" | "cached" | null

const PORTFOLIO = "https://urva.vercel.app"

function fmt(n: number | null, currency: string | null) {
  if (n === null) return "—"
  try {
    return new Intl.NumberFormat("en-IN", {
      style: currency ? "currency" : "decimal",
      currency: currency ?? undefined,
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return n.toLocaleString()
  }
}

function toCsv(inv: Invoice) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const rows = [
    ["description", "quantity", "unit_price", "amount"].join(","),
    ...inv.lineItems.map((li) => [li.description, li.quantity, li.unitPrice, li.amount].map(esc).join(",")),
    "",
    ["subtotal", inv.subtotal].map(esc).join(","),
    ["tax", inv.taxAmount].map(esc).join(","),
    ["total", inv.total].map(esc).join(","),
  ]
  return rows.join("\n")
}

export default function Home() {
  const [text, setText] = useState("")
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [mode, setMode] = useState<Mode>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showJson, setShowJson] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function extract(payload: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    setInvoice(null)
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Extraction failed.")
      setInvoice(data.invoice)
      setMode(data.mode)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  async function onFile(file: File) {
    const buf = await file.arrayBuffer()
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
    setText("")
    extract({ fileData: b64, mediaType: file.type || "application/pdf" })
  }

  function download() {
    if (!invoice) return
    const blob = new Blob([toCsv(invoice)], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${invoice.invoiceNumber ?? "invoice"}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
        <header className="mb-10 flex flex-col gap-4 border-b border-neutral-200 pb-8 dark:border-neutral-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ledgerly</h1>
            <p className="mt-2 max-w-xl text-neutral-600 dark:text-neutral-400">
              Drop in an invoice — PDF, photo or plain text — and get structured, validated data back.
              Every figure is re-checked with arithmetic, and anything questionable is flagged rather
              than quietly guessed.
            </p>
          </div>
          <a
            href={PORTFOLIO}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Built by Urva Suthar ↗
          </a>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* Input */}
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Try a sample
              </h2>
              <div className="flex flex-col gap-2">
                {samples.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setText(s.text)
                      extract({ sampleId: s.id })
                    }}
                    disabled={loading}
                    className="group rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-400 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
                  >
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="mt-0.5 text-xs text-neutral-500">{s.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Or use your own
              </h2>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste invoice text here…"
                rows={10}
                className="w-full resize-y rounded-lg border border-neutral-200 bg-white p-3 font-mono text-xs leading-relaxed outline-none focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-900"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => extract({ text })}
                  disabled={loading || !text.trim()}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  {loading ? "Extracting…" : "Extract"}
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                  Upload PDF or image
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onFile(f)
                  }}
                />
              </div>
            </div>
          </section>

          {/* Output */}
          <section>
            {error && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                {error}
              </div>
            )}

            {!invoice && !error && (
              <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-800">
                {loading ? "Reading the document…" : "Pick a sample on the left to see it work."}
              </div>
            )}

            {invoice && (
              <div className="flex flex-col gap-5">
                {mode === "cached" && (
                  <p className="rounded-md bg-neutral-200 px-3 py-2 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    Cached result — no API key configured, so this sample is served precomputed
                    rather than pretending to be a live model call.
                  </p>
                )}

                <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">{invoice.vendor.name ?? "Unknown vendor"}</div>
                      {invoice.vendor.taxId && (
                        <div className="mt-0.5 font-mono text-xs text-neutral-500">{invoice.vendor.taxId}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">{invoice.invoiceNumber ?? "—"}</div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {invoice.issueDate ?? "—"}
                        {invoice.dueDate && ` → due ${invoice.dueDate}`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-sm tabular-nums">
                      <thead>
                        <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                          <th className="pb-2 pr-3 font-medium">Description</th>
                          <th className="pb-2 pr-3 text-right font-medium">Qty</th>
                          <th className="pb-2 pr-3 text-right font-medium">Rate</th>
                          <th className="pb-2 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.lineItems.map((li, i) => (
                          <tr key={i} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                            <td className="py-2 pr-3">{li.description}</td>
                            <td className="py-2 pr-3 text-right text-neutral-600 dark:text-neutral-400">
                              {li.quantity ?? "—"}
                            </td>
                            <td className="py-2 pr-3 text-right text-neutral-600 dark:text-neutral-400">
                              {fmt(li.unitPrice, null)}
                            </td>
                            <td className="py-2 text-right font-medium">{fmt(li.amount, invoice.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <dl className="mt-4 flex flex-col gap-1 border-t border-neutral-200 pt-4 text-sm tabular-nums dark:border-neutral-800">
                    {[
                      ["Subtotal", invoice.subtotal],
                      [invoice.taxRate ? `Tax (${invoice.taxRate}%)` : "Tax", invoice.taxAmount],
                    ].map(([label, val]) => (
                      <div key={String(label)} className="flex justify-between text-neutral-600 dark:text-neutral-400">
                        <dt>{label}</dt>
                        <dd>{fmt(val as number | null, invoice.currency)}</dd>
                      </div>
                    ))}
                    <div className="mt-1 flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold dark:border-neutral-800">
                      <dt>Total</dt>
                      <dd>{fmt(invoice.total, invoice.currency)}</dd>
                    </div>
                  </dl>
                </div>

                {invoice.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                      Check before posting ({invoice.warnings.length})
                    </h3>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {invoice.warnings.map((w, i) => (
                        <li key={i} className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={download}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                  >
                    Download CSV
                  </button>
                  <button
                    onClick={() => setShowJson((v) => !v)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                  >
                    {showJson ? "Hide" : "Show"} JSON
                  </button>
                </div>

                {showJson && (
                  <pre className="max-h-96 overflow-auto rounded-lg border border-neutral-200 bg-white p-4 font-mono text-xs dark:border-neutral-800 dark:bg-neutral-900">
                    {JSON.stringify(invoice, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </section>
        </div>

        <footer className="mt-16 border-t border-neutral-200 pt-6 text-sm text-neutral-500 dark:border-neutral-800">
          Need something like this built for your business?{" "}
          <a href={PORTFOLIO} target="_blank" rel="noreferrer" className="font-medium text-neutral-900 underline underline-offset-4 dark:text-neutral-100">
            Talk to Urva
          </a>
        </footer>
      </div>
    </main>
  )
}
