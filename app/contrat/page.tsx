import { BRAND_NAME, BRAND_LEGAL } from '@/lib/brand'
import { CONTRACT_SECTIONS, CONTRACT_VERSION } from '@/modules/contract/contract-text'

export const metadata = { title: 'Contrat agent' }

export default function ContratPage() {
  return (
    <main className="mc-scroll lp-legal">
      <div className="lp-legal__inner">
        <h1>Contrat agent</h1>
        <p className="mc-muted">Version {CONTRACT_VERSION} · {BRAND_LEGAL}</p>
        <p>Ce document résume les termes de la relation entre chaque agent et {BRAND_NAME}. Une version personnalisée est soumise à la signature électronique lors de l&apos;activation du compte.</p>

        {CONTRACT_SECTIONS.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </section>
        ))}

        <section>
          <h2>Questions</h2>
          <p>Pour toute question sur ce contrat, contactez-nous via la page <a href="/contact">Contact</a>.</p>
        </section>
      </div>
    </main>
  )
}
