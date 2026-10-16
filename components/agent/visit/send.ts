import type { Job, SendResult } from './outbox'

export const SESSION_EXPIRED = 'SESSION_EXPIRED'

/** Envoie une tâche à l'API. Réseau coupé, 5xx ou session expirée (401) : on réessaiera. 4xx : refus définitif. */
export async function sendJob(job: Job): Promise<SendResult> {
  try {
    let res: Response
    if (job.kind === 'step') {
      res = await fetch(`/api/agent/missions/${job.missionId}/steps`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step: job.step, data: job.data }),
      })
    } else {
      const f = new FormData()
      f.set('file', job.blob, 'photo.jpg')
      f.set('category', job.category)
      f.set('clientAt', job.clientAt)
      if (job.exifTakenAt) f.set('exifTakenAt', job.exifTakenAt)
      if (job.exifLat != null) f.set('exifLat', String(job.exifLat))
      if (job.exifLng != null) f.set('exifLng', String(job.exifLng))
      res = await fetch(`/api/agent/missions/${job.missionId}/photos`, { method: 'POST', body: f })
    }
    const body = (await res.json().catch(() => ({}))) as { state?: unknown; error?: string }
    if (res.ok) return { ok: true, state: body.state ?? null }
    if (res.status === 401) return { ok: false, retry: true, status: 401, error: SESSION_EXPIRED }
    const retry = res.status >= 500
    return { ok: false, retry, status: res.status, error: body.error ?? (retry ? 'Server unavailable' : 'Rejected') }
  } catch {
    return { ok: false, retry: true, error: 'Network error' }
  }
}
