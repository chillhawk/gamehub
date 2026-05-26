import './globals.css'
import type { Metadata } from 'next'
import { Navigation } from '@/components/ui/Navigation'

export const metadata: Metadata = {
  title: 'PartyHub — Premium Casual Gaming',
  description: 'PartyHub is the elegant multiplayer gaming platform.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300..900;1,9..40,300..900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  )
}
