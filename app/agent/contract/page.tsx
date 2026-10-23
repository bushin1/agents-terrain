import { AppBar } from '@/components/agent/app-bar'
import { Icon } from '@/components/mc/icons'
import { usd } from '@/components/mc/money'
import { requireAgentIn } from '@/lib/agent-guard'
import { CONTRACT_IS_DRAFT, CONTRACT_SECTIONS } from '@/modules/contract'
import { getSettings } from '@/modules/settings'
import { ContractForm } from './contract-form'

export default async function ContractPage() {
  await requireAgentIn(['CERTIFIED'])
  const { tierAmountsCents: a } = await getSettings()
  const bullets = [
    'Vous êtes un travailleur autonome, pas un employé.',
    `Vous êtes payé par avis vérifié : ${usd(a.QUICK_TASK)} (STARTER), jusqu’à ${usd(a.QUICK_TASK + 300)} (OR) par avis validé.`,
    'Vous gérez votre propre fiscalité. Nous envoyons le formulaire 1099-NEC si requis (États-Unis).',
    'Vous publiez les avis depuis votre propre compte Google — nous n’avons jamais accès à vos identifiants.',
    'L’une ou l’autre des parties peut mettre fin à cet accord à tout moment.',
  ]
  return (
    <>
      <AppBar title="Votre contrat" />
      <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8 }}>
        <span className="mc-badge mc-badge--bonus">1 Contrat</span>
        <span className="mc-badge mc-badge--outline">2 Paiements · bientôt</span>
      </div>
      <main className="mc-scroll" style={{ paddingTop: 16, flex: 'none' }}>
        <h1 className="h1">Votre contrat de travailleur autonome, en clair</h1>
        <ul className="mc-card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bullets.map((t) => (
            <li key={t} className="mc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <span style={{ color: 'var(--success)' }}><Icon name="check" /></span>
              <span className="body-s" style={{ fontSize: 15, lineHeight: '22px' }}>{t}</span>
            </li>
          ))}
        </ul>
        <details style={{ marginTop: 16 }}>
          <summary className="mc-link mc-row" style={{ minHeight: 44, cursor: 'pointer' }}><Icon name="external" className="mc-ico--sm" /> Lire l&apos;accord complet</summary>
          <div className="mc-card mc-card--sunk" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CONTRACT_SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="h3">{s.title}</h2>
                <p className="body-s" style={{ marginTop: 4 }}>{s.body}</p>
              </section>
            ))}
          </div>
        </details>
      </main>
      <ContractForm />
    </>
  )
}
