import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { memorySmsDriver } from '@/modules/sms/driver'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent } from '@/tests/helpers/factories'
import { apply, authorizeAgentOtp, requestLoginCode } from './index'
import { OTP_MAX_PER_IP_HOUR, verifyOtp } from './otp'

// Géocodage simulé (aucun appel réseau) ; le reste du module geo reste réel.
vi.mock('@/modules/geo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/geo')>()),
  geocodeZip: vi.fn(async (zip: string) => (zip === '99999' ? null : { lat: 42.3496, lng: -71.0746, state: 'MA' })),
}))

const now = new Date('2026-10-16T12:00:00Z')
const form = {
  firstName: 'Maya', lastName: 'Thompson-Okafor', email: 'maya@example.com', phone: '(617) 555-1234',
  birthDate: '2005-03-14', occupation: 'College student', howDidYouHear: 'Instagram ad',
  zip: '02116', radiusMiles: '25', hasCar: 'yes', availability: ['mon-am'], confirm18: 'on',
}
const lastCode = () => /(\d{6})/.exec(memorySmsDriver.sent.at(-1)!.body)![1]

describe('candidature', () => {
  beforeEach(resetDb)

  it('crée un candidat APPLICANT géolocalisé et lui envoie un code', async () => {
    const r = await apply(form, now)
    expect(r).toEqual({ ok: true, phone: '+16175551234' })
    const agent = await prisma.agent.findUniqueOrThrow({ where: { phone: '+16175551234' } })
    expect(agent).toMatchObject({ status: 'APPLICANT', lat: 42.3496, radiusMiles: 25, hasCar: true })
    expect(memorySmsDriver.sent).toHaveLength(1)
    expect(memorySmsDriver.sent[0].to).toBe('+16175551234')
  })

  it('renvoie les erreurs par champ', async () => {
    const r = await apply({ ...form, birthDate: '2010-01-01', zip: 'abc' }, now)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.fieldErrors).toMatchObject({ birthDate: 'You must be 18 or older', zip: 'Enter a 5-digit ZIP code' })
  })

  it('refuse un ZIP introuvable', async () => {
    const r = await apply({ ...form, zip: '99999' }, now)
    expect(r).toEqual({ ok: false, fieldErrors: { zip: 'We could not find this ZIP code' } })
  })

  it('refuse un email ou un téléphone déjà inscrit', async () => {
    await makeAgent({ email: 'maya@example.com' })
    const r = await apply(form, now)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.fieldErrors.email).toContain('already exists')
  })
})

describe('connexion par code', () => {
  beforeEach(resetDb)

  it('le bon code connecte le candidat et le fait passer en TRAINING', async () => {
    await apply(form, now)
    const user = await authorizeAgentOtp('617-555-1234', lastCode(), now)
    expect(user?.name).toBe('Maya')
    const agent = await prisma.agent.findUniqueOrThrow({ where: { phone: '+16175551234' } })
    expect(agent.status).toBe('TRAINING')
    expect(agent.phoneVerifiedAt).not.toBeNull()
  })

  it('un mauvais code échoue et compte un essai ; un code ne sert qu’une fois', async () => {
    await apply(form, now)
    const code = lastCode()
    const wrong = code === '000000' ? '111111' : '000000'
    expect(await authorizeAgentOtp('+16175551234', wrong, now)).toBeNull()
    expect((await prisma.otpCode.findFirstOrThrow()).attempts).toBe(1)
    expect(await authorizeAgentOtp('+16175551234', code, now)).not.toBeNull()
    expect(await authorizeAgentOtp('+16175551234', code, now)).toBeNull()
  })

  it('n’envoie aucun SMS à un numéro inconnu, sans le révéler', async () => {
    expect(await requestLoginCode('617-555-9999')).toEqual({ ok: true, phone: '+16175559999' })
    expect(memorySmsDriver.sent).toHaveLength(0)
  })

  it('limite à 3 codes par quart d’heure, numéro inscrit ou non (pas d’indice sur l’inscription)', async () => {
    await makeAgent({ phone: '+16175551111' })
    for (let i = 0; i < 3; i++) expect((await requestLoginCode('6175551111')).ok).toBe(true)
    expect(await requestLoginCode('6175551111')).toEqual({ ok: false, error: 'Too many codes requested. Try again in 15 minutes.' })
    for (let i = 0; i < 3; i++) await requestLoginCode('6175552222')
    expect(await requestLoginCode('6175552222')).toEqual({ ok: false, error: 'Too many codes requested. Try again in 15 minutes.' })
  })

  it('limite les demandes par adresse IP (pompage SMS)', async () => {
    for (let i = 0; i < OTP_MAX_PER_IP_HOUR; i++) await requestLoginCode(`617555${String(3000 + i)}`, now, '198.51.100.9')
    expect(await requestLoginCode('6175554999', now, '198.51.100.9')).toEqual({ ok: false, error: 'Too many codes requested. Try again later.' })
  })

  it('une rafale de mauvais codes ne dépasse pas 5 essais', async () => {
    await apply(form, now)
    const code = lastCode()
    const guesses = Array.from({ length: 20 }, (_, i) => String((Number(code) + 1 + i) % 1_000_000).padStart(6, '0'))
    await Promise.all(guesses.map((g) => verifyOtp('+16175551234', g, now)))
    expect((await prisma.otpCode.findFirstOrThrow({ where: { phone: '+16175551234' } })).attempts).toBe(5)
    expect(await verifyOtp('+16175551234', code, now)).toBe(false) // code brûlé
  })
})
