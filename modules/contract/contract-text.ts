import { BRAND_NAME } from ‘@/lib/brand’

export const CONTRACT_VERSION = ‘2026-10-v1’
export const CONTRACT_IS_DRAFT = false

export const CONTRACT_SECTIONS: { title: string; body: string }[] = [
  {
    title: ‘Statut de travailleur autonome’,
    body: `Vous travaillez en tant que travailleur autonome (entrepreneur indépendant), et non en tant qu’employé de ${BRAND_NAME}. Vous choisissez librement les missions que vous acceptez, leur moment et leur lieu. Il n’y a aucun quota et aucune heure minimum exigée.`,
  },
  {
    title: ‘Nature des missions’,
    body: `Les missions consistent à publier un avis honnête sur la fiche Google Business Profile d’une entreprise locale, depuis votre propre compte Google. Vous rédigez l’avis en vos propres mots, à partir de votre connaissance réelle de l’entreprise ou de la zone géographique. Aucune visite physique n’est requise. Vous devez être localisé dans la ville ou l’état de la cible au moment de la mission.`,
  },
  {
    title: ‘Ce pour quoi vous êtes payé’,
    body: `Vous êtes payé par avis vérifié, au tarif affiché dans l’application au moment où vous acceptez la mission. Le montant dépend de votre niveau (STARTER : 2 $, BRONZE : 3 $, SILVER : 4 $, OR : 5 $). Le paiement est effectué chaque vendredi, pour les avis ayant survécu 14 jours depuis leur publication. Un avis retiré par Google dans ce délai n’est pas rémunéré.`,
  },
  {
    title: ‘Intégrité des avis’,
    body: `Les avis que vous publiez doivent refléter votre opinion sincère. Vous ne rédigez jamais un avis sur instruction explicite de contenu (note imposée, texte dicté mot pour mot). ${BRAND_NAME} fournit des exemples de formulation à titre indicatif uniquement — vous êtes libre de les reformuler entièrement. Vous ne publiez jamais plusieurs avis pour le même établissement.`,
  },
  {
    title: ‘Protocole et confidentialité’,
    body: `Vous vous engagez à respecter le protocole fourni pour chaque mission. Vous ne divulguez pas les fiches cibles à des tiers. Vous n’utilisez jamais votre accès à la plateforme pour contacter directement les établissements concernés.`,
  },
  {
    title: ‘Identité et compte Google’,
    body: `Vous publiez les avis depuis votre propre compte Google, sous votre propre nom. ${BRAND_NAME} n’a jamais accès à vos identifiants Google. Vous n’utilisez pas de compte créé pour l’occasion ni de compte partagé.`,
  },
  {
    title: ‘Relation avec Google’,
    body: `${BRAND_NAME} est une société indépendante, sans affiliation avec Google LLC. Google Business Profile est une marque déposée de Google LLC. Vous ne représentez jamais être un employé ou un partenaire officiel de Google.`,
  },
  {
    title: ‘Fiscalité’,
    body: `Vous êtes responsable de la déclaration et du paiement de vos propres impôts et cotisations sociales selon la législation de votre pays de résidence. ${BRAND_NAME} fournit les documents fiscaux requis par la loi applicable (formulaire 1099-NEC pour les États-Unis, lorsque le seuil légal est atteint).`,
  },
  {
    title: ‘Résiliation’,
    body: `L’une ou l’autre des parties peut mettre fin à cet accord à tout moment, sans préavis. Les gains déjà validés restent dus et seront versés à la prochaine date de paiement habituelle.`,
  },
]
