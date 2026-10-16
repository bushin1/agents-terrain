import { BRAND_NAME, BRAND_LEGAL, BRAND_ADDRESS } from '@/lib/brand'

export const metadata = { title: 'Contact' }

export default function ContactPage() {
  return (
    <main className="mc-scroll lp-legal">
      <div className="lp-legal__inner">
        <h1>Nous contacter</h1>
        <p>Besoin d&apos;aide ou d&apos;une réponse à une question ? Voici comment nous joindre.</p>

        <section>
          <h2>Support agent</h2>
          <p>Pour toute question concernant votre compte, une mission en cours, un paiement ou un problème technique :</p>
          <ul>
            <li>Envoyez un message depuis votre espace agent (onglet <strong>Profil</strong>) ;</li>
            <li>Ou envoyez un courriel à <a href={`mailto:support@allo-chantiers.fr`}>support@allo-chantiers.fr</a>.</li>
          </ul>
          <p>Notre équipe répond en général dans les 24 heures ouvrables, du lundi au vendredi.</p>
        </section>

        <section>
          <h2>Données personnelles (RGPD / LPRPDE)</h2>
          <p>Pour exercer vos droits d&apos;accès, de rectification ou de suppression de vos données, écrivez à : <a href="mailto:privacy@allo-chantiers.fr">privacy@allo-chantiers.fr</a>.</p>
          <p>Consultez notre <a href="/confidentialite">Politique de confidentialité</a> pour en savoir plus.</p>
        </section>

        <section>
          <h2>Partenariats et presse</h2>
          <p>Pour toute demande commerciale ou presse : <a href="mailto:contact@allo-chantiers.fr">contact@allo-chantiers.fr</a>.</p>
        </section>

        <section>
          <h2>Coordonnées légales</h2>
          <address>
            <strong>{BRAND_LEGAL}</strong><br />
            {BRAND_ADDRESS}
          </address>
          <p>{BRAND_NAME} est une société indépendante, sans affiliation avec Google LLC.</p>
        </section>
      </div>
    </main>
  )
}
