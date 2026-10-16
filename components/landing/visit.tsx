import { Scene } from './illustrations'

export function Visit() {
  const steps = [
    ["Niche + montant affichés", "Vous voyez la catégorie (ex : « Béton — Boston MA ») et le montant avant d'accepter. Pas d'adresse à ce stade."],
    ["Engagement signé d'un clic", "En acceptant, vous confirmez respecter le protocole à la lettre. La fiche Google Business ciblée vous est alors révélée."],
    ["Vous rédigez et publiez l'avis", "Minimum 100 caractères, depuis votre propre compte Google, sur la fiche ciblée. Vous soumettez un screenshot de confirmation."],
    ["Période de survie — 14 jours", "L'avis doit rester en ligne 14 jours. Un PDF de suivi vous est fourni. Un avis retiré par Google n'est pas payé."],
    ["Validation et paiement", "Après 14 jours, votre gain est validé et versé le vendredi suivant."],
  ]
  return (
    <section className="lp-sec" aria-labelledby="visit-h">
      <div className="lp-wrap lp-visit__grid">
        <div>
          <p className="lp-eyebrow">Une mission en pratique</p>
          <h2 className="lp-h2" id="visit-h">De la niche à votre virement, étape par étape.</h2>
          <p className="lp-lede">Pas de visite physique. Vous publiez l&apos;avis depuis votre téléphone, depuis votre ville.</p>
          <Scene name="visit" className="lp-visitphoto" label="Un agent publie un avis Google depuis son téléphone." />
        </div>
        <ol className="lp-timeline">
          {steps.map(([title, text]) => (
            <li className="lp-vstep lp-tl" key={title}>
              <span className="lp-tl__t" />
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
