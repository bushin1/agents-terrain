import type { AgentStatus, EarningStatus, EarningTier, FraudType, MissionStatus, MissionType, PhotoCategory, ProStatus } from '@prisma/client'

export const PRO_STATUS_LABELS: Record<ProStatus, string> = {
  TO_CALL: 'À appeler', AGREED: 'D’accord', MISSION_OPEN: 'Mission ouverte', VISITED: 'Visité',
  LISTING_LIVE: 'Fiche en ligne', CLIENT: 'Client', LOST: 'Perdu',
}
export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  OPEN: 'Ouverte', ACCEPTED: 'Acceptée', SUBMITTED: 'Soumise', NEEDS_FIX: 'Correction demandée',
  VALIDATED: 'Validée', REJECTED: 'Rejetée', CANCELLED: 'Annulée',
}
export const MISSION_TYPE_LABELS: Record<MissionType, string> = { VISIT: 'Visite', RETURN_VISIT: 'Visite de retour', QUICK_TASK: 'Quick Task' }
export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  APPLICANT: 'Candidat', TRAINING: 'En formation', LOCKED: 'Bloqué (quiz)', REFUSED: 'Refusé',
  CERTIFIED: 'Certifié', ACTIVE: 'Actif', SUSPENDED: 'Suspendu',
}
export const FRAUD_LABELS: Record<FraudType, string> = {
  CHECKIN_FAR: 'Check-in éloigné', DUPLICATE_PRO: 'Pro déjà visité', PHOTO_EXIF_MISMATCH: 'Photos suspectes (EXIF)',
  PRO_DENIED: 'Le pro conteste la visite', LOW_PRO_RATING: 'Note basse du pro', NO_SHOW: 'Absence', LATE_SYNC: 'Check-in synchronisé tard',
  REVIEW_REMOVED: 'Avis supprimé', REVIEW_SUSPICIOUS: 'Avis suspect',
}
export const TIER_LABELS: Record<EarningTier, string> = {
  VISIT: 'Visite', LIVE: 'Fiche en ligne', CLIENT: 'Client signé', RETURN_VISIT: 'Visite de retour', URGENCY: 'Bonus urgence', QUICK_TASK: 'Quick Task',
}
export const EARNING_STATUS_LABELS: Record<EarningStatus, string> = { PAYABLE: 'À payer', PAID: 'Payé', VOID: 'Annulé' }
export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  LOGO: 'Logo', VEHICLE: 'Véhicule', TEAM: 'Équipe', EQUIPMENT: 'Matériel', JOB: 'Chantier',
}
export const LEVEL_LABELS: Record<'BRONZE' | 'SILVER' | 'GOLD', string> = { BRONZE: 'Bronze', SILVER: 'Silver', GOLD: 'Gold' }

export const STEP_LABELS: Record<string, string> = {
  checkin: 'Check-in', consent: 'Accord signé', profile: 'Fiche Google', invite: 'Invitation', verification: 'Vérification', checkout: 'Départ',
}
// Valeurs saisies par l'agent dans la checklist (modules/missions/checklist-rule.ts).
export const VALUE_LABELS: Record<string, string> = {
  CREATED: 'Fiche créée',
  CLAIMED: 'Fiche existante revendiquée',
  INVITE_SENT: 'Invitation gestionnaire envoyée',
  INVITE_NOT_ALLOWED_YET: 'Ajout d’utilisateurs pas encore proposé par Google',
  VIDEO_DONE: 'Vérification vidéo faite',
  VIDEO_NOT_OFFERED: 'Vidéo non proposée pour l’instant',
  OTHER_METHOD_STARTED: 'Autre méthode lancée',
}
export const AUDIT_LABELS: Record<string, string> = {
  'pro.create': 'Pro créé', 'pro.update': 'Pro modifié', 'pro.status': 'Statut du pro changé',
  'mission.create': 'Mission publiée', 'mission.accepted': 'Mission acceptée', 'mission.open': 'Mission remise en ligne',
  'mission.submitted': 'Visite soumise', 'visit.submit': 'Checklist envoyée', 'mission.validated': 'Visite validée',
  'mission.needs_fix': 'Correction demandée', 'mission.rejected': 'Visite rejetée', 'mission.cancelled': 'Mission annulée',
  'mission.reschedule': 'Mission replanifiée', 'mission.widen': 'Rayon élargi', 'mission.urgency_bonus': 'Bonus urgence',
  'mission.pro_reply': 'Réponse SMS du pro', 'flag.resolve': 'Alerte résolue',
}

export const PRO_STATUSES = Object.keys(PRO_STATUS_LABELS) as ProStatus[]
export const MISSION_STATUSES = Object.keys(MISSION_STATUS_LABELS) as MissionStatus[]
export const AGENT_STATUSES = Object.keys(AGENT_STATUS_LABELS) as AgentStatus[]
