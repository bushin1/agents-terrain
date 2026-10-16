// Géocodage gratuit et sans clé : Zippopotam pour un ZIP, le géocodeur du Census américain pour
// une adresse. Toute erreur (réseau, absence de résultat) renvoie null : l'appelant décide.

export async function geocodeZip(zip: string): Promise<{ lat: number; lng: number; state: string } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = (await res.json()) as { places?: { latitude: string; longitude: string; 'state abbreviation': string }[] }
    const p = data.places?.[0]
    if (!p) return null
    return { lat: Number(p.latitude), lng: Number(p.longitude), state: p['state abbreviation'] }
  } catch {
    return null
  }
}

export async function geocodeAddress(oneLine: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress')
    url.searchParams.set('address', oneLine)
    url.searchParams.set('benchmark', 'Public_AR_Current')
    url.searchParams.set('format', 'json')
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = (await res.json()) as { result?: { addressMatches?: { coordinates: { x: number; y: number } }[] } }
    const m = data.result?.addressMatches?.[0]
    if (!m) return null
    return { lat: m.coordinates.y, lng: m.coordinates.x }
  } catch {
    return null
  }
}
