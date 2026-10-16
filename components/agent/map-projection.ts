// Place une mission sur le motif de carte (coordonnées en % du cadre) selon sa direction et sa distance
// depuis l'agent. Illustration, pas une vraie carte : les positions reçues sont déjà arrondies (≈ 1 km).
const MILES_PER_DEG_LAT = 69
const MILES_PER_DEG_LNG_EQUATOR = 69.17
const MARGIN = 42 // % du rayon utile autour du centre (on garde 8 % de bord pour les pins)

export function projectToMap(center: { lat: number; lng: number }, point: { lat: number; lng: number }, radiusMiles: number) {
  const r = Math.max(radiusMiles, 1)
  const dx = (point.lng - center.lng) * MILES_PER_DEG_LNG_EQUATOR * Math.cos((center.lat * Math.PI) / 180)
  const dy = (point.lat - center.lat) * MILES_PER_DEG_LAT
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  const round = (v: number) => Math.round(v * 10) / 10
  return { x: round(50 + clamp(dx / r) * MARGIN), y: round(50 - clamp(dy / r) * MARGIN) }
}
