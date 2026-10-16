import { Icon, tradeIcon } from './icons'
import { maxPerBusiness, usd, type PayAmounts } from './money'

// Carte de mission : tout ce qu'il faut pour décider (métier, ville, distance, créneau, décomposition
// complète de la paie) avant d'entrer. Port de MapCrew.missionCard. Jamais le nom de l'entreprise ni
// l'adresse avant l'acceptation : le composant n'a pas de prop pour ça.

export interface MissionCardProps {
  /** Métier libre du pro (« Fence contractor ») : choisit l'icône. */
  trade: string
  /** Titre affiché : la catégorie, jamais le nom de l'entreprise. */
  title: string
  /** Ville seulement, ex. « Naperville, IL ». */
  city: string
  /** Distance lisible, ex. « 3.2 mi ». */
  distance: string
  /** Créneau lisible, ex. « Tue, Oct 20 · 10–11 AM ». */
  slot: string
  /** Montants des réglages, en cents. */
  amounts: PayAmounts
  bonusCents?: number
  /** Page de la mission. Sans href (illustration de la landing), la carte n'est pas interactive. */
  href?: string
  className?: string
}

export function MissionCard({ trade, title, city, distance, slot, amounts, bonusCents = 0, href, className }: MissionCardProps) {
  const cls = className ? `mc-mission ${className}` : 'mc-mission'
  const body = (
    <>
      <div className="mc-mission__top">
        <span className="mc-trade">
          <Icon name={tradeIcon(trade)} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mc-between" style={{ alignItems: 'flex-start' }}>
            <div className="mc-mission__title">{title}</div>
            {bonusCents > 0 ? (
              <span className="mc-badge mc-badge--bonus">
                <Icon name="flag" />
                {` Bonus +${usd(bonusCents)}`}
              </span>
            ) : null}
          </div>
          <div className="mc-mission__meta">
            <span>
              <Icon name="pin" className="mc-ico--sm" />
              {`${city} · ${distance}`}
            </span>
            <span>
              <Icon name="calendar" className="mc-ico--sm" />
              {slot}
            </span>
          </div>
        </div>
      </div>
      <div className="mc-mission__pay">
        <span className="mc-mission__split">
          <b>{usd(amounts.VISIT)}</b> visit + <b>{usd(amounts.LIVE)}</b> live + <b>{usd(amounts.CLIENT)}</b> if customer
          {bonusCents > 0 ? (
            <>
              {' + '}
              <b>{usd(bonusCents)}</b> bonus
            </>
          ) : null}
        </span>
        <span className="mc-mission__total">
          <small>up to </small>
          {usd(maxPerBusiness(amounts, bonusCents))}
        </span>
      </div>
    </>
  )
  if (href) {
    return (
      <a className={cls} href={href} style={{ textDecoration: 'none' }}>
        {body}
      </a>
    )
  }
  return <div className={cls}>{body}</div>
}
