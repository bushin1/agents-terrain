import { Scene } from './illustrations'

export function Visit() {
  const steps = [
    ["Catégorie révélée", "Vous acceptez la mission en voyant la catégorie (ex : « Café »). La localisation exacte reste cachée."],
    ["Adresse dévoilée", "À 5 minutes de votre départ, l'application vous révèle l'adresse. Vous vous y rendez comme un client normal."],
    ["Vous consommez, vous observez", "Prenez un café, un repas, faites un achat — vivez vraiment l'expérience. Vos notes restent privées."],
    ["Vous rédigez votre avis", "Dans l'application, vous écrivez votre avis honnête (minimum 100 caractères). Il est ensuite publié sur Google par vous-même."],
    ["Notre équipe vérifie", "Nous confirmons que l'avis est bien en ligne. Un avis supprimé par Google n'est pas payé."],
    ["Payé chaque vendredi", "Une fois approuvé, votre gain s'ajoute à votre solde et vous est versé le vendredi suivant."],
  ]
  return (
    <section className="lp-sec" aria-labelledby="visit-h">
      <div className="lp-wrap lp-visit__grid">
        <div>
          <p className="lp-eyebrow">Une mission en pratique</p>
          <h2 className="lp-h2" id="visit-h">De la catégorie à votre virement, étape par étape.</h2>
          <p className="lp-lede">L&apos;application vous guide à chaque moment. La formation couvre le reste.</p>
          <Scene name="visit" className="lp-visitphoto" label="Un agent entre dans un café pour vivre l'expérience et rédiger un avis honnête." />
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
