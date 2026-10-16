// Aides des server actions du back-office : lecture du FormData, messages d'erreur sûrs.

/** État renvoyé par une server action à son formulaire (useActionState). */
export type ActionState = {
  error?: string
  ok?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string> // saisie renvoyée pour la réafficher après une erreur
  needsConfirmation?: boolean
}

/** Champs texte d'un FormData (sans les fichiers ni les champs « $ACTION… » ajoutés par Next). */
export function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of fd.entries()) {
    if (typeof value === 'string' && !key.startsWith('$ACTION')) out[key] = value
  }
  return out
}

export function formText(fd: FormData, name: string): string {
  const v = fd.get(name)
  return typeof v === 'string' ? v.trim() : ''
}

/** Paramètre d'URL ou champ réduit aux valeurs permises (filtres de statut). */
export function pickEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}

const UNEXPECTED = 'Erreur inattendue. Rechargez la page ; si le problème persiste, prévenez un admin.'

/**
 * Message affichable pour une erreur levée par un service. Les services lèvent des messages courts en
 * français (« Motif obligatoire », « Transition refusée : … ») ; tout le reste (Prisma, réseau, Zod) est
 * journalisé côté serveur et remplacé par un message générique : jamais de détail technique à l'écran.
 */
export function actionError(e: unknown): string {
  if (e instanceof Error && !e.name.startsWith('Prisma') && e.message.length > 0 && e.message.length <= 200 && !e.message.includes('\n')) {
    return e.message
  }
  console.error('[admin] action échouée', e)
  return UNEXPECTED
}

/** Message de la page de connexion selon `?error=` (« forbidden » vient de requireAdmin, le reste d'Auth.js). */
export function loginErrorMessage(code: string | string[] | undefined): string | null {
  const c = Array.isArray(code) ? code[0] : code
  if (!c) return null
  if (c === 'forbidden') return 'Accès refusé : votre compte n’a pas (ou plus) accès à cette page.'
  if (c === 'AccessDenied') return 'Connexion refusée : utilisez votre compte Google @allo-chantiers.fr, inscrit par un admin.'
  return 'La connexion a échoué. Réessayez.'
}
