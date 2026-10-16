import { redirect } from 'next/navigation'
import { BRAND_NAME } from '@/lib/brand'
import { requireAgent } from '@/lib/session'
import { signOut } from '@/lib/auth'
import { Icon } from '@/components/mc/icons'

const MESSAGES = {
  APPLICANT: ['Verify your phone', 'Log in again with the code we text you to finish your application.'],
  LOCKED: ['Your quiz is locked', 'You used your 3 attempts. Our team will review your account and contact you by text.'],
  REFUSED: ['Application closed', `We can’t offer missions to your account. Thank you for your interest in ${BRAND_NAME}.`],
  SUSPENDED: ['Account paused', 'Your account is paused while our team reviews a recent visit. Validated earnings stay payable. We’ll contact you by text.'],
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
