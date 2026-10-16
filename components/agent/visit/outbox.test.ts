import { describe, expect, it, vi } from 'vitest'
import { Outbox, memoryStore, type Job, type SendResult } from './outbox'

const step = (id: string, s = 'checkin'): Job => ({ id, kind: 'step', missionId: 'm1', step: s, data: {} })

describe('Outbox', () => {
  it('envoie dans l’ordre et vide la file ; garde le dernier état renvoyé', async () => {
    const sent: string[] = []
    const box = new Outbox(memoryStore(), async (j) => { sent.push(j.id); return { ok: true, state: { last: j.id } } })
    await box.enqueue(step('a'))
    await box.enqueue(step('b'))
    expect(await box.flush()).toMatchObject({ sent: 2, state: { last: 'b' }, remaining: 0, stopped: null })
    expect(sent).toEqual(['a', 'b'])
  })

  it('s’arrête à la première erreur réseau et garde la suite pour plus tard', async () => {
    const box = new Outbox(memoryStore(), async (j): Promise<SendResult> => (j.id === 'b' ? { ok: false, retry: true, error: 'Network error' } : { ok: true, state: null }))
    for (const id of ['a', 'b', 'c']) await box.enqueue(step(id))
    expect(await box.flush()).toMatchObject({ sent: 1, remaining: 2, stopped: 'Network error' })
    expect((await box.pending()).map((j) => j.id)).toEqual(['b', 'c'])
  })

  it('abandonne une tâche refusée par le serveur (4xx) et continue', async () => {
    const box = new Outbox(memoryStore(), async (j): Promise<SendResult> => (j.id === 'a' ? { ok: false, retry: false, status: 409, error: 'Check in first.' } : { ok: true, state: 's' }))
    await box.enqueue(step('a', 'invite'))
    await box.enqueue(step('b'))
    const r = await box.flush()
    expect(r.rejected.map((x) => [x.job.id, x.error])).toEqual([['a', 'Check in first.']])
    expect(r).toMatchObject({ sent: 1, remaining: 0 })
  })

  it('deux flush simultanés n’envoient chaque tâche qu’une fois', async () => {
    const send = vi.fn(async (): Promise<SendResult> => ({ ok: true, state: null }))
    const box = new Outbox(memoryStore(), send)
    await box.enqueue(step('a'))
    await Promise.all([box.flush(), box.flush()])
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('un ajout pendant la suppression d’une tâche envoyée n’est pas perdu (store lent)', async () => {
    let jobs: Job[] = []
    const slow = { load: async () => { await new Promise((r) => setTimeout(r, 5)); return [...jobs] }, save: async (n: Job[]) => { await new Promise((r) => setTimeout(r, 5)); jobs = [...n] } }
    const box = new Outbox(slow, async () => ({ ok: true, state: null }))
    await box.enqueue(step('a'))
    const flushing = box.flush()
    await box.enqueue(step('b'))
    await flushing
    await box.flush()
    expect(jobs).toEqual([])
  })

  it('une tâche ajoutée pendant l’envoi part dans le même passage', async () => {
    const store = memoryStore()
    const send = vi.fn(async (j: Job): Promise<SendResult> => {
      if (j.id === 'a') await box.enqueue(step('b'))
      return { ok: true, state: null }
    })
    const box = new Outbox(store, send)
    await box.enqueue(step('a'))
    expect((await box.flush()).sent).toBe(2)
  })
})
