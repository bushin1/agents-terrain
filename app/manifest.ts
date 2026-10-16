import type { MetadataRoute } from 'next'
import { BRAND_NAME } from '@/lib/brand'

// PWA des agents : installée depuis l'espace agent, elle s'ouvre sur /agent, en plein écran.
// Couleurs du design system : forest (barre d'état) et paper (écran de lancement).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME} — Field agents`,
    short_name: BRAND_NAME,
    description: 'Missions, visits and earnings for field agents.',
    start_url: '/agent',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#1f3b2f',
    background_color: '#f6f2ea',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
