import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Web3Provider } from '@/components/providers/web3-provider'
import './globals.css'

const editorialSerif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
})

const bodySans = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-code',
})

export const metadata: Metadata = {
  title: 'Conduit - Chain AI Agents, Pay Per Call',
  description: 'Visual workflow builder for AI agent micropayments on Arc Network. Sub-cent transactions, drag-and-drop composition, IPFS storage.',
  generator: 'v0.app',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${editorialSerif.variable} ${bodySans.variable} ${mono.variable} min-h-screen font-sans antialiased`}>
        <Web3Provider>
          {children}
        </Web3Provider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
