import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Public_Sans } from 'next/font/google'
import { BRAND_NAME } from '@/lib/brand'
// Ordre important : jetons, puis composants du design system, puis surcharges locales.
import '@/design/mapcrew/tokens.css'
import '@/design/mapcrew/components/bundle.css'
import './globals.css'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-bricolage', display: 'swap' })
const publicSans = Public_Sans({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-public-sans', display: 'swap' })

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: 'Get paid to help local contractors get on Google Maps.',
}

export const viewport: Viewport = { themeColor: '#1f3b2f', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${bricolage.variable} ${publicSans.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
