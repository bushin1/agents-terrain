// Les créneaux sont saisis à l'heure locale du pro et stockés en UTC.

const STATE_TZ: Record<string, string> = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix', AR: 'America/Chicago',
  CA: 'America/Los_Angeles', CO: 'America/Denver', CT: 'America/New_York', DE: 'America/New_York',
  DC: 'America/New_York', FL: 'America/New_York', GA: 'America/New_York', HI: 'Pacific/Honolulu',
  ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis', IA: 'America/Chicago',
  KS: 'America/Chicago', KY: 'America/New_York', LA: 'America/Chicago', ME: 'America/New_York',
  MD: 'America/New_York', MA: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago',
  MS: 'America/Chicago', MO: 'America/Chicago', MT: 'America/Denver', NE: 'America/Chicago',
  NV: 'America/Los_Angeles', NH: 'America/New_York', NJ: 'America/New_York', NM: 'America/Denver',
  NY: 'America/New_York', NC: 'America/New_York', ND: 'America/Chicago', OH: 'America/New_York',
  OK: 'America/Chicago', OR: 'America/Los_Angeles', PA: 'America/New_York', RI: 'America/New_York',
  SC: 'America/New_York', SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago',
  UT: 'America/Denver', VT: 'America/New_York', VA: 'America/New_York', WA: 'America/Los_Angeles',
  WV: 'America/New_York', WI: 'America/Chicago', WY: 'America/Denver',
}

export const US_TIME_ZONES = Array.from(new Set(Object.values(STATE_TZ))).sort()

/** Fuseau proposé par défaut pour un État (modifiable à la saisie : certains États en ont deux). */
export function defaultTimeZoneForState(state: string): string | null {
  return STATE_TZ[state.trim().toUpperCase()] ?? null
}

/** Décalage (ms) entre l'heure locale du fuseau et UTC à l'instant `ts`. */
function tzOffsetMs(ts: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ts))
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - ts
}

/** « 2026-07-01T10:00 » à l'heure locale du fuseau → instant UTC. */
export function zonedLocalToUtc(local: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!m) throw new Error(`Créneau invalide : ${local}`)
  const [, y, mo, d, h, mi] = m.map(Number)
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const first = tzOffsetMs(guess, timeZone)
  let ts = guess - first
  const second = tzOffsetMs(ts, timeZone)
  if (second !== first) ts = guess - second
  return new Date(ts)
}

/** Créneau lisible dans le fuseau du pro, ex. « Wed, Jul 1, 10:00 AM ». */
export function formatSlot(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date)
}

/** Valeur pour un <input type="datetime-local"> à l'heure locale du fuseau. */
export function toZonedLocalInput(date: Date, timeZone: string): string {
  const local = new Date(date.getTime() + tzOffsetMs(date.getTime(), timeZone))
  return local.toISOString().slice(0, 16)
}
