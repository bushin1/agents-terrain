export interface Point { lat: number; lng: number }

const EARTH_RADIUS_M = 6_371_000
export const METERS_PER_MILE = 1609.344

/** Distance à vol d'oiseau (formule de haversine), en mètres. */
export function distanceMeters(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function distanceMiles(a: Point, b: Point): number {
  return distanceMeters(a, b) / METERS_PER_MILE
}

/** Position arrondie au centième de degré (≈ 1 km) : sert à afficher une mission sans révéler l'adresse. */
export function approximate(p: Point): Point {
  return { lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 }
}
