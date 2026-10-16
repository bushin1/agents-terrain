import type { ReactNode } from 'react'
import { Icon } from '@/components/mc/icons'
import { BRAND_ADDRESS, BRAND_LEGAL, BRAND_SUPPORT, independenceLineFr } from '@/lib/brand'

export function Faq() {
  const items: { q: string; a: ReactNode }[] = [
    { q: 'Quand suis-je payé ?', a: <><p>Chaque vendredi, via Stripe, pour tout avis approuvé avant [jour et heure limite à préciser]. L'argent va au compte bancaire ou à la carte de débit que vous connectez.</p><p>Votre premier virement peut prendre quelques jours supplémentaires pendant que Stripe vérifie vos informations.</p></> },
    { q: 'Dois-je avoir une voiture ?', a: <p>Non. Vous indiquez votre rayon de déplacement et si vous avez un véhicule — nous ne vous montrons que les missions accessibles. Certaines zones offrent moins de missions sans voiture.</p> },
    { q: 'Est-ce légal et conforme ?', a: <p>{`Oui. Vous vous rendez physiquement au commerce et partagez votre vraie expérience — exactement comme un client ordinaire qui rédige un avis. ${independenceLineFr()} ${BRAND_LEGAL} est une entreprise enregistrée au ${BRAND_ADDRESS}.`}</p> },
    { q: 'Comment fonctionne la fiscalité ?', a: <p>Vous êtes travailleur autonome : nous ne retenons aucun impôt. Si vos revenus dépassent le seuil de déclaration applicable, vous recevrez les documents fiscaux requis via Stripe en début d'année suivante. Ce n'est pas un conseil fiscal.</p> },
    { q: 'Que se passe-t-il si le commerce est fermé ?', a: <p>Signalez-le dans l'application. Vous n'êtes pas pénalisé pour une fermeture imprévue. [Politique d'annulation à préciser]</p> },
    { q: 'Pourquoi 18 ans et plus ?', a: <p>Vous signez un contrat de travailleur autonome et êtes payé via Stripe. Les deux exigent d'être majeur.</p> },
  ]
  return (
    <section className="lp-sec" id="faq" aria-labelledby="faq-h">
      <div className="lp-wrap lp-faq__grid">
        <div>
          <p className="lp-eyebrow">FAQ</p>
          <h2 className="lp-h2" id="faq-h">Des questions légitimes.</h2>
          <p className="lp-lede">{`Encore des doutes ? Écrivez à ${BRAND_SUPPORT} — un vrai humain vous répond.`}</p>
        </div>
        <div className="lp-faq">
          {items.map((item, i) => (
            <details key={item.q} open={i === 0}>
              <summary>{item.q}<Icon name="plus" /></summary>
              <div>{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
