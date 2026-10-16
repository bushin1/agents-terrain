import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { assertSafeKey, contentTypeForKey, type StorageDriver } from './keys'

export function localDriver(dir: string): StorageDriver {
  const root = resolve(dir)
  const pathFor = (key: string) => {
    assertSafeKey(key)
    return join(root, key)
  }
  return {
    async put(key, body) {
      const path = pathFor(key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, body)
    },
    async get(key) {
      try {
        return { body: await readFile(pathFor(key)), contentType: contentTypeForKey(key) }
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw e
      }
    },
  }
}
