// Découpage de la candidature en 6 écrans (maquette AppApply), sans logique réseau.
export const STEPS = [
  { eyebrow: 'About you', title: 'What’s your name?', fields: ['firstName', 'lastName', 'email'], next: 'your mobile number' },
  { eyebrow: 'About you', title: 'Your mobile number', fields: ['phone'], next: 'your date of birth' },
  { eyebrow: 'About you', title: 'When were you born?', fields: ['birthDate'], next: 'where you can work' },
  { eyebrow: 'Where you’ll work', title: 'Where can you work?', fields: ['zip', 'radiusMiles', 'hasCar'], next: 'when you’re usually free' },
  { eyebrow: 'When you’re free', title: 'When are you usually free?', fields: ['availability'], next: 'review and confirm' },
  { eyebrow: 'Almost done', title: 'Review and confirm', fields: ['confirm18'], next: null },
] as const

export function firstStepWithError(errors: Record<string, string>): number {
  return STEPS.findIndex((s) => s.fields.some((f) => f in errors))
}

/** « 4 », « 7 », « 2005 » → « 2005-04-07 » (vide si une partie manque ; la validation serveur fait le reste). */
export function birthDateFromParts(month: string, day: string, year: string): string {
  if (!month || !day || !year) return ''
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}
