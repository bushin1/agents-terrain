import { PhotoPlaceholder } from '@/components/mc/photo-placeholder'

// Pour qui. Les témoignages restent des placeholders tant qu'aucun agent réel n'a accepté d'être cité
// (règle de contenu n° 3 : jamais de citation inventée). Port de MapCrew.landing.who.
export const TESTIMONIAL_PLACEHOLDER = '[Testimonial placeholder — real agent quote, with permission]'

const PERSONAS = [
  ['Students', 'Fit visits between classes. Pick a mission, go, be back for your 2 PM.', 'Agent with a backpack talking with a concrete contractor beside a mixer truck'],
  ['Parents', 'Daytime only, during school hours, close to home. No quotas, no minimums.', 'Agent and tree-service owner looking at photos next to a chipper'],
  ['Gig workers', 'Pay per mission is fixed and shown up front, with distance. Payouts every Friday.', 'Agent photographing a roofing crew’s truck in a driveway'],
]

export function Who() {
  return (
    <section className="lp-sec lp-sec--sunk" aria-labelledby="who-h">
      <div className="lp-wrap">
        <p className="lp-eyebrow">Who it’s for</p>
        <h2 className="lp-h2" id="who-h">Flexible work for people with a phone and a free morning.</h2>
        <div className="lp-who">
          {PERSONAS.map(([title, text, brief]) => (
            <article className="lp-persona" key={title}>
              <PhotoPlaceholder title={title} brief={brief} />
              <div className="lp-persona__body">
                <h3>{title}</h3>
                <p>{text}</p>
                <p className="lp-quote">{TESTIMONIAL_PLACEHOLDER}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="lp-pills">
          {['No experience needed', 'No quotas', 'You set your radius', '18+ only'].map((pill) => (
            <span className="mc-badge mc-badge--outline" key={pill}>{pill}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
