import { Scene, type SceneName } from './illustrations'

export const TESTIMONIAL_PLACEHOLDER = "[Témoignage à venir — citation d'un vrai agent, avec permission]"

const PERSONAS: [string, string, string, SceneName][] = [
  ["Étudiants", "Faites une mission entre deux cours. Choisissez un commerce proche, allez-y, rédigez votre avis, rentrez.", "Agent avec un sac à dos qui parle à un gérant de commerce", 'student'],
  ["Parents", "Des missions en journée, près de chez vous, pendant les heures d'école. Aucun quota, aucun minimum.", "Agent qui discute avec le propriétaire d'un commerce de proximité", 'parent'],
  ["Travailleurs à la pige", "Rémunération fixe affichée avant chaque mission, distance incluse. Versement chaque vendredi.", "Agent qui prend des notes dans un commerce local", 'gig'],
]

export function Who() {
  return (
    <section className="lp-sec lp-sec--sunk" aria-labelledby="who-h">
      <div className="lp-wrap">
        <p className="lp-eyebrow">Pour qui</p>
        <h2 className="lp-h2" id="who-h">Un revenu flexible pour ceux qui ont un téléphone et une matinée libre.</h2>
        <div className="lp-who">
          {PERSONAS.map(([title, text, brief, scene]) => (
            <article className="lp-persona" key={title}>
              <Scene name={scene} label={brief} className="lp-persona__art" />
              <div className="lp-persona__body">
                <h3>{title}</h3>
                <p>{text}</p>
                <p className="lp-quote">{TESTIMONIAL_PLACEHOLDER}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="lp-pills">
          {["Aucune expérience requise", "Aucun quota", "Vous choisissez votre rayon", "18 ans et plus"].map((pill) => (
            <span className="mc-badge mc-badge--outline" key={pill}>{pill}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
