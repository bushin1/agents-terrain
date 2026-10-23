import type { NextConfig } from 'next'

// En-têtes de sécurité appliqués à toutes les réponses. La caméra et la géolocalisation sont
// autorisées pour notre propre origine : la checklist de visite en a besoin.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
