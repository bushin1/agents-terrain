import { Icon, type IconName } from '@/components/mc/icons'
import { independenceLine } from '@/lib/brand'

// Confiance et sécurité, sur fond forêt. Porte la ligne d'indépendance (sur fond papier, impossible à
// manquer) et la seule phrase autorisée sur les avis. Port de MapCrew.landing.trust.
export const NO_REVIEWS_LINE = 'Agents are never paid for reviews, and never write or ask for them.'

const ITEMS: [IconName, string, string][] = [
  ['store', 'Every business said yes first', 'Our team calls each contractor and books the visit. You never show up cold.'],
  ['sun', 'Daytime appointments', 'Visits are scheduled during business hours, at the business.'],
  ['id', 'Identity-verified agents', 'Every agent verifies their ID before their first mission.'],
  ['lock', 'You never handle passwords', 'The owner signs in on their own phone, to their own account.'],
  ['pen', 'A clear contractor agreement', 'You’re an independent contractor. The agreement is short and in plain English.'],
  ['chat', 'Real support', 'Message a real person from the app during visits. [Support hours placeholder]'],
]

export function Trust() {
  return (
    <section className="lp-sec lp-sec--forest" id="safety" aria-labelledby="trust-h">
      <div className="lp-wrap">
        <p className="lp-eyebrow">Trust and safety</p>
        <h2 className="lp-h2" id="trust-h">Built so you know exactly who you’re working with.</h2>
        <div className="lp-trust">
          {ITEMS.map(([icon, title, text]) => (
            <div className="lp-titem" key={title}>
              <span className="lp-titem__i"><Icon name={icon} /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </div>
          ))}
        </div>
        <p className="lp-indep"><Icon name="info" /><span>{independenceLine()}</span></p>
        <p className="lp-lede" style={{ marginTop: 16, fontSize: 15 }}>{NO_REVIEWS_LINE}</p>
      </div>
    </section>
  )
}
