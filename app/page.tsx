import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Landing } from '@/components/landing/landing'
import { BRAND_NAME } from '@/lib/brand'
import { getSettings } from '@/modules/settings'

const title = `${BRAND_NAME} — Donnez votre avis. Gagnez de l'argent.`
const description =
  'Visitez de vrais commerces locaux, rédigez votre avis honnête, et soyez payé chaque vendredi. De 2 $ à 5 $ par avis approuvé. Travailleur autonome, 18 ans et plus.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: BRAND_NAME, type: 'website', locale: 'fr_CA' },
}

export default async function Home() {
  await connection()
  const settings = await getSettings()
  return <Landing levelCents={settings.quickTask.levelCents} />
}
