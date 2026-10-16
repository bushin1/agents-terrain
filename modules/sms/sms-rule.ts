/** Numéro US (plan NANP) → E.164 « +1XXXXXXXXXX », ou null si ce n'est pas un numéro US valide. */
export function normalizeUsPhone(input: string): string | null {
  const compact = input.replace(/[\s().-]/g, '')
  const international = compact.startsWith('+')
  let digits = international ? compact.slice(1) : compact
  if (!/^\d+$/.test(digits)) return null
  if (international && digits.length !== 11) return null
  if (digits.length === 10) digits = '1' + digits
  // Indicatif régional et central ne commencent jamais par 0 ou 1.
  if (!/^1[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null
  return '+' + digits
}

export type InboundReply = { kind: 'RATING'; value: 1 | 2 | 3 | 4 | 5 } | { kind: 'DENIED' } | { kind: 'OTHER' }

/** Réponse d'un pro au SMS après visite : une note 1–5, « NO », ou autre chose. */
export function parseInbound(body: string): InboundReply {
  const t = body.trim().toUpperCase().replace(/[.!]+$/, '')
  if (/^[1-5]$/.test(t)) return { kind: 'RATING', value: Number(t) as 1 | 2 | 3 | 4 | 5 }
  if (t === 'NO' || t === 'NOPE') return { kind: 'DENIED' }
  return { kind: 'OTHER' }
}
