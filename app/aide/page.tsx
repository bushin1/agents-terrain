import { BRAND_NAME } from '@/lib/brand'

export const metadata = { title: "Centre d'aide" }

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Dois-je visiter physiquement l\'entreprise ?',
    a: 'Non. Aucune visite physique n\'est requise. Vous devez simplement être localisé dans la ville ou l\'état de la cible (votre position GPS réelle au moment de la mission). Vous publiez l\'avis depuis votre téléphone, où que vous soyez dans cette zone.',
  },
  {
    q: 'Comment fonctionne la géolocalisation ?',
    a: 'Avant de publier votre avis, la mission vous indique la ville et l\'état de la cible. Votre avis doit être publié depuis cette zone géographique. Google associe votre compte à une zone géographique — si vous publiez régulièrement depuis une ville, cela renforce la crédibilité de l\'avis.',
  },
  {
    q: 'Quand est-ce que je suis payé ?',
    a: 'Les paiements sont effectués chaque vendredi pour les avis ayant survécu 14 jours en ligne depuis leur publication. Si Google retire votre avis dans ce délai, la mission n\'est pas rémunérée pour cette mission précise.',
  },
  {
    q: 'Que se passe-t-il si mon avis est retiré par Google ?',
    a: 'Un avis retiré avant la fin du délai de 14 jours n\'est pas payé. Cela peut arriver si Google détecte un comportement inhabituel (VPN, compte récent, avis en doublon, etc.). Nous vous recommandons de publier depuis votre compte Google habituel, sans VPN.',
  },
  {
    q: 'Puis-je publier plusieurs avis pour la même fiche ?',
    a: 'Non. Vous ne pouvez publier qu\'un seul avis par fiche. Toute tentative de contournement entraîne la suspension du compte.',
  },
  {
    q: 'Quels sont les niveaux et comment monter en grade ?',
    a: 'Il y a 4 niveaux : STARTER (2 $), BRONZE (3 $, atteint après 10 avis validés), SILVER (4 $, après 30 avis), OR (5 $, après 100 avis). La montée de niveau est automatique dès que le seuil est atteint.',
  },
  {
    q: 'Quels numéros de téléphone sont acceptés ?',
    a: 'La plateforme accepte les numéros canadiens (+1), américains (+1) et français (+33). Entrez votre numéro au format international (ex. +1 514 555 0123 ou +33 6 12 34 56 78) ou en format local (0612345678).',
  },
  {
    q: 'Comment fonctionne le quiz de formation ?',
    a: 'Après votre inscription, vous devez réussir un quiz de formation avant d\'accéder aux missions. Vous avez 3 tentatives. En cas d\'échec, notre équipe examiner votre candidature et vous contacte par SMS.',
  },
  {
    q: 'Comment signer mon contrat ?',
    a: 'La signature est électronique et se fait dans l\'application, dans la section Contrat. Vous tapez votre nom légal pour valider. La signature est enregistrée avec horodatage et adresse IP.',
  },
  {
    q: 'Comment me déconnecter ou supprimer mon compte ?',
    a: 'Vous pouvez vous déconnecter depuis l\'onglet Profil. Pour supprimer votre compte, contactez notre support via la page Contact.',
  },
  {
    q: 'Qu\'est-ce que la section GMB US ?',
    a: `En plus des avis, ${BRAND_NAME} proposera prochainement des missions GMB US : création et vérification de fiches Google Business Profile pour des entrepreneurs américains, via un protocole vidéo encadré. Ces missions rapportent environ 20 $ en 15 minutes. Cette fonctionnalité est en développement.`,
  },
]

export default function AidePage() {
  return (
    <main className="mc-scroll lp-legal">
      <div className="lp-legal__inner">
        <h1>Centre d&apos;aide</h1>
        <p>Vous avez une question ? Trouvez la réponse ci-dessous.</p>

        <div className="lp-faq">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="lp-faq__item">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>

        <section>
          <h2>Vous n&apos;avez pas trouvé la réponse ?</h2>
          <p>Contactez notre équipe via la <a href="/contact">page Contact</a>. Nous répondons en général sous 24 heures ouvrables.</p>
        </section>
      </div>
    </main>
  )
}
