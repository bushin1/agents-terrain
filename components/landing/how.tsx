const STEPS = [
  ['Postulez et obtenez votre certification', 'Cinq courtes leçons vidéo et un quiz — environ 45 minutes, en ligne, à votre rythme. Aucune expérience requise.', '~45 min'],
  ['Acceptez une mission près de chez vous', "Vous voyez la catégorie du commerce, la distance et le montant avant d'accepter. La mission vous révèle l'adresse exacte à votre arrivée.", 'Vous choisissez où'],
  ["Visitez, vivez l'expérience, partagez votre avis", 'Allez-y comme un client ordinaire. Votre avis honnête sur Google est vérifié par notre équipe, puis votre gain est ajouté à votre solde.', 'Payé chaque vendredi'],
]

export function How() {
  return (
    <section className="lp-sec" id="how" aria-labelledby="how-h">
      <div className="lp-wrap">
        <p className="lp-eyebrow">Comment ça marche</p>
        <h2 className="lp-h2" id="how-h">Trois étapes. Rien à deviner.</h2>
        <div className="lp-steps">
          {STEPS.map(([title, text, tag], i) => (
            <article className="lp-stepcard" key={title}>
              <span className="lp-stepcard__n">{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="mc-badge mc-badge--outline lp-stepcard__tag">{tag}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
