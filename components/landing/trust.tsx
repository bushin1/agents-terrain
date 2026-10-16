import { Icon, type IconName } from '@/components/mc/icons'
import { independenceLineFr } from '@/lib/brand'

export const AVIS_LINE = "Vous partagez votre vraie expérience après une vraie visite. Jamais un avis inventé."

const ITEMS: [IconName, string, string][] = [
  ['store', 'Que de vraies visites', "Vous devez vous rendre physiquement au commerce. Pas de visite confirmée = pas d'avis = pas de paiement."],
  ['sun', 'Votre expérience, votre avis', "Vous vivez l'expérience en tant que client réel. L'avis reflète ce que vous avez vécu — rien d'inventé."],
  ['id', 'Agents vérifiés', "Chaque agent confirme son identité avant sa première mission."],
  ['lock', 'Vous postez vous-même', "Vous publiez l'avis depuis votre propre compte Google. Nous n'avons jamais accès à vos identifiants."],
  ['pen', 'Un contrat clair', "Vous êtes travailleur autonome. L'entente est courte et en français simple."],
  ['chat', 'Vrai soutien', "Écrivez à un vrai humain depuis l'application pendant vos missions."],
]

export function Trust() {
  return (
    <section className="lp-sec lp-sec--forest" id="safety" aria-labelledby="trust-h">
      <div className="lp-wrap">
        <p className="lp-eyebrow">Confiance et sécurité</p>
        <h2 className="lp-h2" id="trust-h">Conçu pour que vous sachiez exactement avec qui vous travaillez.</h2>
        <div className="lp-trust">
          {ITEMS.map(([icon, title, text]) => (
            <div className="lp-titem" key={title}>
              <span className="lp-titem__i"><Icon name={icon} /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </div>
          ))}
        </div>
        <p className="lp-indep"><Icon name="info" /><span>{independenceLineFr()}</span></p>
        <p className="lp-lede" style={{ marginTop: 16, fontSize: 15 }}>{AVIS_LINE}</p>
      </div>
    </section>
  )
}
