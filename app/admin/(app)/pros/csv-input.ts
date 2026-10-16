import type { ActionState } from '@/app/admin/_lib/forms'

export const MAX_CSV_BYTES = 500_000 // sous la limite de 1 Mo du corps d'une server action

export type ImportState = ActionState & {
  result?: { created: number; withoutCoords: number; errors: { line: number; message: string }[] }
}

/** Contenu à importer : le fichier s'il y en a un, sinon le texte collé. Retire le BOM qu'ajoute Excel. */
export async function readCsvInput(fd: FormData): Promise<{ ok: true; csv: string } | { ok: false; error: string }> {
  const file = fd.get('file')
  let csv: string
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CSV_BYTES) return { ok: false, error: 'Fichier trop gros : 500 Ko au plus.' }
    csv = await file.text()
  } else {
    const text = fd.get('csv')
    csv = typeof text === 'string' ? text : ''
    if (csv.length > MAX_CSV_BYTES) return { ok: false, error: 'Texte trop long : 500 Ko au plus.' }
  }
  csv = csv.replace(/^﻿/, '')
  if (!csv.trim()) return { ok: false, error: 'Collez le contenu du CSV ou choisissez un fichier.' }
  return { ok: true, csv }
}
