import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HumAi Invoice System',
  description: 'A simple invoice management system built with Next.js and React.',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  ) }
