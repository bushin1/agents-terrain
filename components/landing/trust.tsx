import { Icon, type IconName } from '@/components/mc/icons'
import { independenceLineFr } from '@/lib/brand'

export const AVIS_LINE = "Votre avis, votre compte Google, votre réputation. On ne vous demande jamais de mentir — on vous demande de publier."

const ITEMS: [IconName, string, string][] = [
  ['pen', 'Une charte signée avant chaque mission', "Avant de voir la cible, vous confirmez d'un clic respecter le protocole. Ce document vous protège autant que nous."],
  ['sun', 'Votre avis, vos mots', "Vous rédigez ce que vous voulez — minimum 100 caractères. Aucun script imposé. Votre compte, votre voix."],
  ['id', 'Agents vérifiés par ville', "Chaque agent est rattaché à une ville ou un état. Vous ne recevez que des missions dans votre zone."],
  ['lock', 'Vous postez vous-même', "Vous publiez l'avis depuis votre propre compte Google. Nous n'avons jamais accès à vos identifiants."],
  ['store', 'Survie 14 jours', "L'avis doit rester en ligne 14 jours. Un PDF de suivi vous est fourni. Un avis retiré par Google n'est pas payé."],
  ['chat', 'Vrai soutien', "Écrivez à un vrai humain depuis l'application pendant vos missions."],
]

export function Trust() {
  return (
    <section className="lp-sec lp-sec--forest" id="safety" aria-labelledby="trust-h">
      <div className="lp-wrap">
        <p className="lp-eyebrow">Confiance et sécurité</p>
        <h2 className="lp-h2" id="trust-h">Transparent sur ce qu&apos;on vous demande. Net sur ce qu&apos;on vous doit.</h2>
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
