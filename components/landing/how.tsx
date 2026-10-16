const STEPS = [
  ['Postulez et obtenez votre certification', 'Cinq courtes leçons vidéo et un quiz — environ 45 minutes, en ligne, à votre rythme. Aucune expérience requise.', '~45 min'],
  ['Acceptez une mission dans votre ville', "Vous voyez la niche (ex. « Béton — Boston MA ») et le montant avant d'accepter. Un engagement signé d'un clic, et la fiche Google ciblée vous est révélée.", 'Vous choisissez'],
  ['Publiez votre avis, attendez 14 jours', "Depuis votre propre compte Google, sur la fiche ciblée. Notre équipe vérifie après 14 jours de survie, puis votre gain est versé le vendredi.", 'Payé chaque vendredi'],
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
