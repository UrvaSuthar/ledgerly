import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Ledgerly — AI invoice data extraction",
  description:
    "Turn any invoice — PDF, photo or text — into structured, arithmetic-validated data. Built by Urva Suthar.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
