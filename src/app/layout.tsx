import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chicago Childcare Finder',
  description: 'Find daycares, preschools, and schools in the Chicago area',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
