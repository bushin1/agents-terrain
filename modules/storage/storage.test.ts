import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertSafeKey, contentTypeForKey } from './keys'
import { localDriver } from './local'

describe('clés de stockage', () => {
  it('accepte une clé de mission', () => {
    expect(() => assertSafeKey('missions/ckx1/photos/abc.jpg')).not.toThrow()
  })
  it('refuse une remontée de dossier ou une extension inconnue', () => {
    expect(() => assertSafeKey('../etc/passwd.jpg')).toThrow()
    expect(() => assertSafeKey('missions/a/../../b.jpg')).toThrow()
    expect(() => assertSafeKey('missions/a/b.exe')).toThrow()
  })
  it('déduit le type de contenu de l’extension', () => {
    expect(contentTypeForKey('a/b.jpg')).toBe('image/jpeg')
    expect(contentTypeForKey('a/b.png')).toBe('image/png')
  })
})

describe('localDriver', () => {
  it('écrit puis relit un fichier', async () => {
    const driver = localDriver(mkdtempSync(join(tmpdir(), 'storage-')))
    await driver.put('missions/m1/signature.png', Buffer.from([1, 2, 3]))
    const file = await driver.get('missions/m1/signature.png')
    expect(file?.contentType).toBe('image/png')
    expect([...file!.body]).toEqual([1, 2, 3])
  })
  it('renvoie null pour un fichier absent', async () => {
    const driver = localDriver(mkdtempSync(join(tmpdir(), 'storage-')))
    expect(await driver.get('missions/m1/none.jpg')).toBeNull()
  })
})
