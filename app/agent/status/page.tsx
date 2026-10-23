import { redirect } from 'next/navigation'
import { BRAND_NAME } from '@/lib/brand'
import { requireAgent } from '@/lib/session'
import { signOut } from '@/lib/auth'
import { Icon } from '@/components/mc/icons'

const MESSAGES = {
  APPLICANT: ['Vérifiez votre numéro', 'Reconnectez-vous avec le code que nous vous avons envoyé par SMS pour finaliser votre candidature.'],
  LOCKED: ['Quiz bloqué', 'Vous avez utilisé vos 3 tentatives. Notre équipe examine votre compte et vous contactera par SMS.'],
  REFUSED: ['Candidature fermée', `Nous ne pouvons pas proposer de missions à ce compte. Merci de l’intérêt que vous portez à ${BRAND_NAME}.`],
  SUSPENDED: ['Compte suspendu', 'Votre compte est suspendu pendant que notre équipe examine une mission récente. Les gains déjà validés restent dus. Nous vous contacterons par SMS.'],
} as const

export default async function StatusPage() {
  const agent = await requireAgent()
  if (!(agent.status in MESSAGES)) redirect('/agent')
  const [title, body] = MESSAGES[agent.status as keyof typeof MESSAGES]
  async function logout() {
    'use server'
    await signOut({ redirectTo: '/' })
  }
  return (
    <main className="mc-scroll" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 64 }}>
      <span className="mc-trade" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name="info" className="mc-ico--lg" /></span>
      <h1 className="h1" style={{ marginTop: 20 }}>{title}</h1>
      <p className="mc-muted" style={{ marginTop: 8 }}>{body}</p>
      <form action={logout} style={{ marginTop: 32 }}>
        <button type="submit" className="mc-btn mc-btn--secondary mc-btn--block">Log out</button>
      </form>
    </main>
  )
}
