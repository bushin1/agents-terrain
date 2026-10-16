import { BRAND_LEGAL, BRAND_ADDRESS } from '@/lib/brand'

export const metadata = { title: 'Politique de confidentialité' }

export default function ConfidentialitePage() {
  return (
    <main className="mc-scroll lp-legal">
      <div className="lp-legal__inner">
        <h1>Politique de confidentialité</h1>
        <p className="mc-muted">Dernière mise à jour : octobre 2026</p>

        <section>
          <h2>1. Responsable du traitement</h2>
          <p>{BRAND_LEGAL}, {BRAND_ADDRESS}, est responsable du traitement des données personnelles collectées via la Plateforme.</p>
        </section>

        <section>
          <h2>2. Données collectées</h2>
          <p>Lors de votre candidature et de l&apos;utilisation de la Plateforme, nous collectons :</p>
          <ul>
            <li><strong>Données d&apos;identité :</strong> prénom, nom, date de naissance ;</li>
            <li><strong>Coordonnées :</strong> adresse courriel, numéro de téléphone mobile ;</li>
            <li><strong>Données de localisation :</strong> code postal, ville, coordonnées géographiques approximatives ;</li>
            <li><strong>Données d&apos;activité :</strong> missions acceptées, avis soumis, captures d&apos;écran de preuve, gains ;</li>
            <li><strong>Données techniques :</strong> adresse IP, horodatage des connexions et de l&apos;acceptation des chartes.</li>
          </ul>
        </section>

        <section>
          <h2>3. Finalités du traitement</h2>
          <p>Vos données sont traitées pour :</p>
          <ul>
            <li>Gérer votre compte et vos missions ;</li>
            <li>Vous envoyer des codes de connexion par SMS ;</li>
            <li>Valider vos avis et traiter vos paiements ;</li>
            <li>Détecter et prévenir les fraudes ;</li>
            <li>Respecter nos obligations légales (documents fiscaux, registres de consentement).</li>
          </ul>
        </section>

        <section>
          <h2>4. Base légale</h2>
          <p>Le traitement est fondé sur :</p>
          <ul>
            <li>L&apos;exécution du contrat entre vous et la Plateforme (missions, paiements) ;</li>
            <li>Votre consentement (acceptation de la charte, inscription) ;</li>
            <li>Les obligations légales applicables (fiscalité, lutte contre la fraude).</li>
          </ul>
        </section>

        <section>
          <h2>5. Destinataires des données</h2>
          <p>Vos données peuvent être partagées avec :</p>
          <ul>
            <li>Nos prestataires techniques (hébergement, SMS, paiements) liés par des accords de confidentialité ;</li>
            <li>Les autorités fiscales compétentes, dans la mesure requise par la loi ;</li>
            <li>Aucun tiers à des fins marketing ou publicitaires.</li>
          </ul>
        </section>

        <section>
          <h2>6. Durée de conservation</h2>
          <ul>
            <li>Données de compte actif : durée de l&apos;activité + 3 ans ;</li>
            <li>Données fiscales : 7 ans ;</li>
            <li>Données de connexion et IP : 13 mois ;</li>
            <li>Captures d&apos;écran de preuve : 14 jours après validation, puis supprimées.</li>
          </ul>
        </section>

        <section>
          <h2>7. Vos droits (RGPD / LPRPDE)</h2>
          <p>Selon votre lieu de résidence, vous disposez des droits suivants :</p>
          <ul>
            <li>Droit d&apos;accès à vos données ;</li>
            <li>Droit de rectification ;</li>
            <li>Droit à l&apos;effacement (sauf données requises par la loi) ;</li>
            <li>Droit à la limitation du traitement ;</li>
            <li>Droit à la portabilité ;</li>
            <li>Droit d&apos;opposition.</li>
          </ul>
          <p>Pour exercer ces droits, contactez-nous via la page <a href="/contact">Contact</a>.</p>
        </section>

        <section>
          <h2>8. Cookies et traceurs</h2>
          <p>La Plateforme utilise uniquement des cookies strictement nécessaires à son fonctionnement (session, authentification). Aucun cookie publicitaire ou de suivi tiers n&apos;est utilisé.</p>
        </section>

        <section>
          <h2>9. Sécurité</h2>
          <p>Les données sont chiffrées en transit (HTTPS) et au repos. L&apos;accès est limité aux personnes habilitées. Les mots de passe ne sont jamais stockés — l&apos;authentification se fait par code SMS à usage unique.</p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>Toute demande relative à la protection de vos données peut être adressée via notre <a href="/contact">page de contact</a>.</p>
        </section>
      </div>
    </main>
  )
}
