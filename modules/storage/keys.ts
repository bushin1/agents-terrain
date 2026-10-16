export interface StoredFile { body: Buffer; contentType: string }

export interface StorageDriver {
  put(key: string, body: Buffer): Promise<void>
  get(key: string): Promise<StoredFile | null>
}

const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png' }

/** Clés autorisées : segments alphanumériques séparés par « / », extension .jpg ou .png, jamais « .. ». */
export function assertSafeKey(key: string): void {
  if (!/^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*\.(jpg|png)$/i.test(key)) {
    throw new Error(`Clé de stockage refusée : ${key}`)
  }
}

export function contentTypeForKey(key: string): string {
  return TYPES[key.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream'
}
