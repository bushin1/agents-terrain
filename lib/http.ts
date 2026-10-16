import { NextResponse } from 'next/server'

export const jsonError = (status: number, error: string) => NextResponse.json({ error }, { status })

/** Traduit le résultat d'un service de visite en réponse HTTP. */
export function visitResponse(r: { ok: true; state: unknown } | { ok: false; status: number; error: string }) {
  return r.ok ? NextResponse.json({ state: r.state }) : jsonError(r.status, r.error)
}

export type IdContext = { params: Promise<{ id: string }> }
