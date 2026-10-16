// Nom de marque provisoire (à remplacer par la marque définitive via la variable d'environnement)
// et email du compte gestionnaire Google dédié, affiché à l'agent à l'étape « invitation ».
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'MapCrew'

// Mentions légales : placeholders volontairement visibles (comme MapCrew.brand dans bundle.js)
// tant que la société, l'adresse et l'email de support ne sont pas fixés. À remplir avant le lancement public.
export const BRAND_LEGAL = '[Company legal name], Inc.'
export const BRAND_ADDRESS = '[Street address], [City], [State] [ZIP]'
export const BRAND_SUPPORT = '[support@yourdomain.com]'

/** Règle de contenu n° 1 du design system : présente sur toute page marketing (confiance ET pied de page). */
export function independenceLine(): string {
  return `${BRAND_NAME} is an independent company, not affiliated with Google.`
}

/** Version française de la ligne d'indépendance — pages en français. */
export function independenceLineFr(): string {
  return `${BRAND_NAME} est une entreprise indépendante, sans aucun lien avec Google.`
}

export function managerInviteEmail(): string {
  return process.env.MANAGER_INVITE_EMAIL || 'manager@example.com'
}
