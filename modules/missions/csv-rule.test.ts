import { describe, expect, it } from 'vitest'
import { parseCsv, parseProsCsv } from './csv-rule'

describe('parseCsv', () => {
  it('gère guillemets, virgules et guillemets échappés, CRLF', () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n1,2,3\r\n')).toEqual([['a', 'b, c', 'd "e"'], ['1', '2', '3']])
  })
  it('ignore les lignes vides', () => {
    expect(parseCsv('a,b\n\n1,2\n')).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('parseProsCsv', () => {
  const header = 'Business_Name,contact_name,phone,address,city,state,zip,trade'

  it('lit les lignes valides, colonnes dans n’importe quelle casse', () => {
    const r = parseProsCsv(`${header}\n"Delgado Concrete, LLC",Frank,(617) 555-0142,120 Tremont St,Boston,ma,2108,Concrete contractor\n`)
    expect(r.errors).toEqual([])
    expect(r.rows).toEqual([{
      line: 2,
      businessName: 'Delgado Concrete, LLC', contactName: 'Frank', phone: '+16175550142',
      address: '120 Tremont St', city: 'Boston', state: 'MA', zip: '02108', trade: 'Concrete contractor',
    }])
  })

  it('signale les lignes invalides avec leur numéro', () => {
    const r = parseProsCsv(`${header}\nA,,123,1 Main St,Boston,MA,02108,Fence\nB,,6175550199,,Boston,MA,02108,Fence\n`)
    expect(r.rows).toHaveLength(0)
    expect(r.errors).toEqual([
      { line: 2, message: 'Téléphone US invalide' },
      { line: 3, message: 'Adresse manquante' },
    ])
  })

  it('donne le vrai numéro de ligne malgré une ligne vide, accepte ZIP+4 et en-têtes avec espaces', () => {
    const r = parseProsCsv('Business Name,Phone,Address,City,State,ZIP,Trade\n\nA,123,1 Main St,Boston,MA,02108,Fence\nB,6175550199,2 Main St,Boston,MA,02108-1234,Fence\n')
    expect(r.errors).toEqual([{ line: 3, message: 'Téléphone US invalide' }])
    expect(r.rows[0].zip).toBe('02108')
  })

  it('refuse un fichier sans les colonnes obligatoires', () => {
    const r = parseProsCsv('name,phone\nA,6175550199\n')
    expect(r.rows).toEqual([])
    expect(r.errors[0].message).toContain('Colonnes manquantes')
  })
})
