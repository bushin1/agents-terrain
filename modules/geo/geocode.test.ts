import { afterEach, describe, expect, it, vi } from 'vitest'
import { geocodeAddress, geocodeZip } from './geocode'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

describe('geocodeZip', () => {
  it('lit la latitude, la longitude et l’État', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      places: [{ latitude: '42.3496', longitude: '-71.0746', 'state abbreviation': 'MA' }],
    })))
    expect(await geocodeZip('02116')).toEqual({ lat: 42.3496, lng: -71.0746, state: 'MA' })
  })
  it('renvoie null pour un ZIP inconnu', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 404)))
    expect(await geocodeZip('00000')).toBeNull()
  })
  it('renvoie null si le réseau échoue', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network') }))
    expect(await geocodeZip('02116')).toBeNull()
  })
})

describe('geocodeAddress', () => {
  it('lit les coordonnées du premier résultat Census', async () => {
    const fetchMock = vi.fn(async (_input: unknown) => jsonResponse({
      result: { addressMatches: [{ coordinates: { x: -71.0621, y: 42.3564 } }] },
    }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await geocodeAddress('120 Tremont St, Boston, MA 02108')).toEqual({ lat: 42.3564, lng: -71.0621 })
    expect(String(fetchMock.mock.calls[0][0])).toContain('onelineaddress')
  })
  it('renvoie null sans correspondance', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ result: { addressMatches: [] } })))
    expect(await geocodeAddress('nowhere')).toBeNull()
  })
})
