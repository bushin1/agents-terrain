import exifr from 'exifr'

export interface Position { lat: number; lng: number; accuracy: number }

/** Position GPS précise, avec des messages d'aide clairs en cas de refus ou d'échec. */
export function getPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('This browser can’t share your location. Try Chrome or Safari.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) =>
        reject(new Error(e.code === e.PERMISSION_DENIED
          ? 'Location is turned off for this site. Allow location in your browser settings, then tap Check in again.'
          : 'We couldn’t get your location. Step outside or near a window and try again.')),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    )
  })
}

/** Date de prise de vue et GPS de la photo d'origine (la compression les efface : on les lit avant). */
export async function readExif(file: File): Promise<{ takenAt: string | null; lat: number | null; lng: number | null }> {
  const [meta, gps] = await Promise.all([
    exifr.parse(file, ['DateTimeOriginal']).catch(() => null) as Promise<{ DateTimeOriginal?: Date } | null>,
    exifr.gps(file).catch(() => null) as Promise<{ latitude?: number; longitude?: number } | null>,
  ])
  const d = meta?.DateTimeOriginal instanceof Date && !Number.isNaN(meta.DateTimeOriginal.getTime()) ? meta.DateTimeOriginal : null
  return { takenAt: d ? d.toISOString() : null, lat: gps?.latitude ?? null, lng: gps?.longitude ?? null }
}

/** Réduit la photo (1600 px de côté au plus) et la réencode en JPEG : ≈ 300 Ko au lieu de 4 Mo. */
export async function compressToJpeg(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process this photo.'))), 'image/jpeg', quality))
}
