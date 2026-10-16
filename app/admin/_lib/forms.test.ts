import { afterEach, describe, expect, it, vi } from 'vitest'
import { actionError, formText, formValues, loginErrorMessage, pickEnum } from './forms'

afterEach(() => vi.restoreAllMocks())

describe('lecture des formulaires', () => {
  it('garde les champs texte, sans les fichiers ni les champs internes de Next', () => {
    const fd = new FormData()
    fd.set('businessName', 'Delgado Concrete')
    fd.set('lat', '')
    fd.set('file', new File(['a'], 'a.csv'))
    fd.set('$ACTION_ID_abc123', '')
    expect(formValues(fd)).toEqual({ businessName: 'Delgado Concrete', lat: '' })
  })
  it('formText rogne, et renvoie une chaîne vide si le champ manque', () => {
    const fd = new FormData()
    fd.set('reason', '  Ne répond plus ')
    expect(formText(fd, 'reason')).toBe('Ne répond plus')
    expect(formText(fd, 'absent')).toBe('')
  })
  it('pickEnum n’accepte que les valeurs prévues', () => {
    const statuses = ['OPEN', 'ACCEPTED'] as const
    expect(pickEnum('OPEN', statuses)).toBe('OPEN')
    expect(pickEnum('DROP TABLE', statuses)).toBeUndefined()
    expect(pickEnum(['OPEN'], statuses)).toBeUndefined()
    expect(pickEnum(undefined, statuses)).toBeUndefined()
  })
})

describe('actionError', () => {
  it('relaie le message court d’un service', () => {
    expect(actionError(new Error('Motif obligatoire'))).toBe('Motif obligatoire')
  })
  it('masque les erreurs techniques et les journalise', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const prismaError = Object.assign(new Error('Invalid `prisma.mission.update()` invocation'), { name: 'PrismaClientKnownRequestError' })
    for (const e of [prismaError, new Error('ligne 1\nligne 2'), new Error('x'.repeat(300)), 'boom']) {
      expect(actionError(e)).toBe('Erreur inattendue. Rechargez la page ; si le problème persiste, prévenez un admin.')
    }
    expect(spy).toHaveBeenCalledTimes(4)
  })
})

describe('loginErrorMessage', () => {
  it('explique un refus d’accès ou de connexion Google', () => {
    expect(loginErrorMessage('forbidden')).toContain('Accès refusé')
    expect(loginErrorMessage(['AccessDenied'])).toContain('@allo-chantiers.fr')
    expect(loginErrorMessage('Configuration')).toBe('La connexion a échoué. Réessayez.')
    expect(loginErrorMessage(undefined)).toBeNull()
  })
})
