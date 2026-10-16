import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { assertSafeKey, contentTypeForKey, type StorageDriver } from './keys'

interface R2Config { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string }

export function r2Driver(cfg: R2Config): StorageDriver {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  })
  return {
    async put(key, body) {
      assertSafeKey(key)
      await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: body, ContentType: contentTypeForKey(key) }))
    },
    async get(key) {
      assertSafeKey(key)
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }))
        const bytes = await res.Body!.transformToByteArray()
        return { body: Buffer.from(bytes), contentType: res.ContentType ?? contentTypeForKey(key) }
      } catch (e) {
        if (e instanceof NoSuchKey) return null
        throw e
      }
    },
  }
}
