import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, SettingsSchema } from '@/modules/settings'
import { settingsErrors, settingsFromForm, settingsToFormDefaults } from './settings-form-data'

function formOf(values: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}
const defaults = settingsToFormDefaults(DEFAULT_SETTINGS)

describe('formulaire des réglages', () => {
  it('affiche les montants en dollars et relit exactement les réglages', () => {
    expect(defaults).toMatchObject({ tier_VISIT: '40.00', tier_RETURN_VISIT: '20.00', tier_QUICK_TASK: '3.00', level_1_minValidated: '5', level_1_bonusPct: '10', widenRadiusMiles: '50', qt_warmupCount: '15', qt_expirationHours: '2' })
    expect(settingsFromForm(formOf(defaults))).toEqual({ ok: true, value: DEFAULT_SETTINGS })
  })
  it('convertit les dollars en cents, virgule acceptée', () => {
    const r = settingsFromForm(formOf({ ...defaults, tier_LIVE: '27,5' }))
    expect(r.ok && r.value.tierAmountsCents.LIVE).toBe(2750)
  })
  it('signale chaque champ illisible', () => {
    expect(settingsFromForm(formOf({ ...defaults, tier_VISIT: 'abc', level_1_bonusPct: '10.5', widenRadiusMiles: '' }))).toEqual({
      ok: false,
      fieldErrors: { tier_VISIT: 'Montant invalide (ex. 40 ou 40.50)', level_1_bonusPct: 'Nombre entier attendu', widenRadiusMiles: 'Nombre entier attendu' },
    })
  })
})

describe('settingsErrors', () => {
  it('rattache les erreurs de bornes au bon champ, en français', () => {
    const levels = DEFAULT_SETTINGS.levels.map((l) => (l.name === 'GOLD' ? { ...l, bonusPct: 150 } : l))
    const parsed = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, levels, widenRadiusMiles: 0 })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(settingsErrors(parsed.error.issues)).toEqual({ level_2_bonusPct: 'Doit être au plus 100', widenRadiusMiles: 'Doit être au moins 1' })
  })
  it('rattache la règle « un niveau commence à 0 » à l’ensemble des niveaux', () => {
    const levels = DEFAULT_SETTINGS.levels.map((l) => ({ ...l, minValidated: l.minValidated + 1 }))
    const parsed = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, levels })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(settingsErrors(parsed.error.issues)).toEqual({ levels: 'Un niveau doit commencer à 0 mission' })
  })
})
