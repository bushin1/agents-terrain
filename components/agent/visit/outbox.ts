import { get, set } from 'idb-keyval'

export type Job =
  | { id: string; kind: 'step'; missionId: string; step: string; data: unknown }
  | {
      id: string
      kind: 'photo'
      missionId: string
      blob: Blob
      category: string
      clientAt: string
      exifTakenAt: string | null
      exifLat: number | null
      exifLng: number | null
    }

export type SendResult = { ok: true; state: unknown } | { ok: false; retry: boolean; status?: number; error: string }
export type Sender = (job: Job) => Promise<SendResult>

export interface OutboxStore {
  load(): Promise<Job[]>
  save(jobs: Job[]): Promise<void>
}

export interface FlushResult {
  sent: number
  state: unknown | null // dernier état de visite renvoyé par le serveur
  rejected: { job: Job; error: string }[]
  stopped: string | null // erreur qui a interrompu l'envoi (réseau, serveur), ou null
  remaining: number
}

/** File d'attente persistante des actions de la checklist. Un seul envoi à la fois ; ordre conservé. */
export class Outbox {
  private running: Promise<FlushResult> | null = null
  private lock: Promise<unknown> = Promise.resolve()

  constructor(private store: OutboxStore, private send: Sender) {}

  /** Lecture-écriture de la file une à la fois : un ajout pendant un envoi ne perd ni ne double rien. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.lock.then(fn, fn)
    this.lock = next.catch(() => undefined)
    return next
  }

  pending(): Promise<Job[]> {
    return this.exclusive(() => this.store.load())
  }

  enqueue(job: Job): Promise<void> {
    return this.exclusive(async () => {
      await this.store.save([...(await this.store.load()), job])
    })
  }

  flush(): Promise<FlushResult> {
    this.running ??= this.run().finally(() => {
      this.running = null
    })
    return this.running
  }

  private drop(id: string) {
    return this.exclusive(async () => {
      await this.store.save((await this.store.load()).filter((j) => j.id !== id))
    })
  }

  private async run(): Promise<FlushResult> {
    let sent = 0
    let state: unknown | null = null
    let stopped: string | null = null
    const rejected: { job: Job; error: string }[] = []
    for (;;) {
      const job = (await this.pending())[0]
      if (!job) break
      const r = await this.send(job)
      if (r.ok) {
        sent++
        state = r.state
        await this.drop(job.id)
      } else if (r.retry) {
        stopped = r.error
        break
      } else {
        rejected.push({ job, error: r.error })
        await this.drop(job.id)
      }
    }
    return { sent, state, rejected, stopped, remaining: (await this.pending()).length }
  }
}

/** Stockage dans IndexedDB : survit à un rechargement de page ou à une coupure de batterie. */
export function idbStore(key = 'mapcrew-outbox-v1'): OutboxStore {
  return {
    load: async () => (await get<Job[]>(key)) ?? [],
    save: (jobs) => set(key, jobs),
  }
}

/** Stockage en mémoire (tests). */
export function memoryStore(): OutboxStore {
  let jobs: Job[] = []
  return {
    load: async () => [...jobs],
    save: async (next) => {
      jobs = [...next]
    },
  }
}
