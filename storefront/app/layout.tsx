import './globals.css'

import type {Metadata} from 'next'
import {Inter} from 'next/font/google'

export const metadata: Metadata = {
  title: {
    template: '%s | Store',
    default: 'Store',
  },
  description: 'Shop our collection of culturally authentic apparel.',
}

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
