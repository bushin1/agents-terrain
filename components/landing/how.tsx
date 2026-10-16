// « How it works » en trois étapes. Port de MapCrew.landing.how.
const STEPS = [
  ['Apply and get certified', 'Five short video lessons and a quiz — about 45 minutes, online, at your pace.', 'About 45 min'],
  ['Pick missions near you', 'Every mission shows the trade, distance, time slot and exact pay before you accept. You choose when and where.', 'No quotas'],
  ['Visit, help, get paid', 'Spend 45–60 minutes with the owner, set up their profile on their own phone, take the photos, check out.', 'Paid every Friday'],
]

export function How() {
  return (
    <section className="lp-sec" id="how" aria-labelledby="how-h">
      <div className="lp-wrap">
        <p className="lp-eyebrow">How it works</p>
        <h2 className="lp-h2" id="how-h">Three steps. No guesswork.</h2>
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
