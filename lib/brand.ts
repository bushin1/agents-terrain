// Nom de marque provisoire (à remplacer par la marque définitive via la variable d'environnement)
// et email du compte gestionnaire Google dédié, affiché à l'agent à l'étape « invitation ».
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'MapCrew'

export function managerInviteEmail(): string {
  return process.env.MANAGER_INVITE_EMAIL || 'manager@example.com'
}
