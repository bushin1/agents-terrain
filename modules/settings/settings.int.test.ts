import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { DEFAULT_SETTINGS, getSettings, saveSettings } from './index'

describe('settings', () => {
  beforeEach(resetDb)

  it('renvoie les valeurs par défaut tant que rien n’est enregistré', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS.tierAmountsCents.VISIT).toBe(4000)
  })

  it('enregistre, relit et trace la modification', async () => {
    const next = { ...DEFAULT_SETTINGS, tierAmountsCents: { ...DEFAULT_SETTINGS.tierAmountsCents, VISIT: 4500 } }
    await saveSettings(next, 'marvin@allo-chantiers.fr')
    expect((await getSettings()).tierAmountsCents.VISIT).toBe(4500)
    expect(await prisma.auditLog.count({ where: { action: 'settings.update' } })).toBe(1)
  })

  it('refuse des niveaux sans palier de départ à 0', async () => {
    const bad = { ...DEFAULT_SETTINGS, levels: DEFAULT_SETTINGS.levels.map((l) => ({ ...l, minValidated: l.minValidated + 1 })) }
    await expect(saveSettings(bad, 'x')).rejects.toThrow()
  })

  it('refuse un montant négatif', async () => {
    const bad = { ...DEFAULT_SETTINGS, tierAmountsCents: { ...DEFAULT_SETTINGS.tierAmountsCents, LIVE: -1 } }
    await expect(saveSettings(bad, 'x')).rejects.toThrow()
  })
})
