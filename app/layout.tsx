import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Daily Journal — Quote-Aesthetic Study Log',
  description: 'A minimalist daily learning journal. Log what you studied and discovered each day, with a thoughtful quote to set the tone.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
