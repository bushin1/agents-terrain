import { describe, expect, it } from 'vitest'
import { MAX_CSV_BYTES, readCsvInput } from './csv-input'

const HEADER = 'business_name,phone,address,city,state,zip,trade\n'
const ROW = 'Acme Fence,6175550142,1 Main St,Boston,MA,02108,Fence\n'

describe('readCsvInput', () => {
  it('préfère le fichier au texte collé, sans le BOM d’Excel', async () => {
    const fd = new FormData()
    fd.set('csv', 'ignoré')
    fd.set('file', new File([`﻿${HEADER}${ROW}`], 'pros.csv', { type: 'text/csv' }))
    expect(await readCsvInput(fd)).toEqual({ ok: true, csv: `${HEADER}${ROW}` })
  })
  it('prend le texte collé quand aucun fichier n’est choisi (le navigateur envoie un fichier vide)', async () => {
    const fd = new FormData()
    fd.set('csv', `﻿${HEADER}`)
    fd.set('file', new File([], ''))
    expect(await readCsvInput(fd)).toEqual({ ok: true, csv: HEADER })
  })
  it('refuse un envoi vide ou trop gros', async () => {
    expect(await readCsvInput(new FormData())).toEqual({ ok: false, error: 'Collez le contenu du CSV ou choisissez un fichier.' })
    const big = new FormData()
    big.set('file', new File(['x'.repeat(MAX_CSV_BYTES + 1)], 'big.csv'))
    expect(await readCsvInput(big)).toEqual({ ok: false, error: 'Fichier trop gros : 500 Ko au plus.' })
  })
})
