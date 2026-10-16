import { normalizeUsPhone } from '@/modules/sms/sms-rule'

export const PRO_CSV_COLUMNS = ['business_name', 'contact_name', 'phone', 'address', 'city', 'state', 'zip', 'trade'] as const
const REQUIRED = ['business_name', 'phone', 'address', 'city', 'state', 'zip', 'trade'] as const

export interface ProCsvRow {
  businessName: string
  contactName: string | null
  phone: string
  address: string
  city: string
  state: string
  zip: string
  trade: string
}

/** CSV minimal (RFC 4180) : guillemets, guillemets doublés, virgules et retours à la ligne entre guillemets.
 *  Chaque ligne garde son numéro dans le fichier (1 = première ligne), lignes vides comprises. */
export function parseCsvRows(text: string): { line: number; cells: string[] }[] {
  const rows: { line: number; cells: string[] }[] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let lineNo = 1
  let rowStart = 1
  const endRow = () => {
    row.push(field)
    field = ''
    if (row.some((f) => f.trim() !== '')) rows.push({ line: rowStart, cells: row })
    row = []
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '\n') lineNo++
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') { i++; lineNo++ }
      else if (c === '\r') lineNo++
      endRow()
      rowStart = lineNo
    } else field += c
  }
  endRow()
  return rows
}

export function parseCsv(text: string): string[][] {
  return parseCsvRows(text).map((r) => r.cells)
}

const MESSAGES: Record<(typeof REQUIRED)[number], string> = {
  business_name: 'Nom de l’entreprise manquant',
  phone: 'Téléphone manquant',
  address: 'Adresse manquante',
  city: 'Ville manquante',
  state: 'État manquant',
  zip: 'Code postal manquant',
  trade: 'Métier manquant',
}

export function parseProsCsv(text: string): { rows: ProCsvRow[]; errors: { line: number; message: string }[] } {
  const [header, ...lines] = parseCsvRows(text)
  // « Business Name » (export Sheets/Excel) est lu comme « business_name ».
  const cols = (header?.cells ?? []).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const missing = REQUIRED.filter((c) => !cols.includes(c))
  if (missing.length > 0) return { rows: [], errors: [{ line: 1, message: `Colonnes manquantes : ${missing.join(', ')}` }] }

  const rows: ProCsvRow[] = []
  const errors: { line: number; message: string }[] = []
  lines.forEach(({ line, cells }) => {
    const get = (name: string) => (cells[cols.indexOf(name)] ?? '').trim()
    const empty = REQUIRED.find((c) => !get(c))
    if (empty) return void errors.push({ line, message: MESSAGES[empty] })
    const phone = normalizeUsPhone(get('phone'))
    if (!phone) return void errors.push({ line, message: 'Téléphone US invalide' })
    const state = get('state').toUpperCase()
    if (!/^[A-Z]{2}$/.test(state)) return void errors.push({ line, message: 'État invalide (2 lettres)' })
    // ZIP+4 accepté (on garde les 5 premiers chiffres) ; Excel supprime le 0 initial des ZIP de Nouvelle-Angleterre.
    const zip = get('zip').replace(/^(\d{5})-\d{4}$/, '$1').padStart(5, '0')
    if (!/^\d{5}$/.test(zip)) return void errors.push({ line, message: 'Code postal invalide' })
    rows.push({
      businessName: get('business_name'),
      contactName: get('contact_name') || null,
      phone,
      address: get('address'),
      city: get('city'),
      state,
      zip,
      trade: get('trade'),
    })
  })
  return { rows, errors }
}
