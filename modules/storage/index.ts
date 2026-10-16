import type { StorageDriver } from './keys'
import { localDriver } from './local'
import { r2Driver } from './r2'

export { assertSafeKey, contentTypeForKey, type StorageDriver, type StoredFile } from './keys'

let cached: StorageDriver | null = null

/** Driver choisi par STORAGE_DRIVER : « local » (dossier STORAGE_DIR) ou « r2 » (Cloudflare R2). */
export function getStorage(): StorageDriver {
  if (cached) return cached
  const driver = process.env.STORAGE_DRIVER ?? 'local'
  if (driver === 'r2') {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
      throw new Error('R2 incomplet : R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET')
    }
    cached = r2Driver({ accountId: R2_ACCOUNT_ID, accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, bucket: R2_BUCKET })
  } else {
    cached = localDriver(process.env.STORAGE_DIR ?? '.data/uploads')
  }
  return cached
}
