import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Landing } from '@/components/landing/landing'
import { BRAND_NAME } from '@/lib/brand'
import { getSettings } from '@/modules/settings'

const title = `${BRAND_NAME} — Get paid to put local businesses on the map`
const description =
  'Visit local contractors who already agreed to a visit, help each owner set up their own free Google Business Profile on their phone, and get paid every Friday. 18+, independent contractor.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: BRAND_NAME, type: 'website', locale: 'en_US' },
}

// Les montants viennent des réglages en base : la page se rend à la demande, jamais pendant le build.
export default async function Home() {
  await connection()
  const settings = await getSettings()
  return <Landing amounts={settings.tierAmountsCents} levels={settings.levels} />
}
