import { BRAND_LEGAL, BRAND_ADDRESS } from '@/lib/brand'

export const metadata = { title: "Conditions d'utilisation" }

export default function ConditionsPage() {
  return (
    <main className="mc-scroll lp-legal">
      <div className="lp-legal__inner">
        <h1>Conditions d&apos;utilisation</h1>
        <p className="mc-muted">Dernière mise à jour : octobre 2026</p>

        <section>
          <h2>1. Présentation</h2>
          <p>La présente plateforme (ci-après « la Plateforme ») est exploitée par {BRAND_LEGAL}, dont le siège social est situé au {BRAND_ADDRESS}. En accédant à la Plateforme ou en créant un compte agent, vous acceptez les présentes conditions dans leur intégralité.</p>
        </section>

        <section>
          <h2>2. Objet</h2>
          <p>La Plateforme met en relation des travailleurs autonomes (« agents ») avec des missions consistant à publier des avis honnêtes sur des fiches Google Business Profile d&apos;entreprises locales situées aux États-Unis. Aucune visite physique n&apos;est requise. L&apos;agent doit être géolocalisé dans la ville ou l&apos;état de la cible au moment de la mission.</p>
        </section>

        <section>
          <h2>3. Admissibilité</h2>
          <p>Pour s&apos;inscrire, l&apos;agent doit :</p>
          <ul>
            <li>Avoir au moins 18 ans ;</li>
            <li>Posséder un compte Google personnel actif ;</li>
            <li>Être en mesure de publier des avis depuis son propre compte Google ;</li>
            <li>Résider au Canada (Québec ou Ontario), en France, ou avoir accès à des villes américaines ciblées.</li>
          </ul>
        </section>

        <section>
          <h2>4. Processus de mission</h2>
          <p>Chaque mission est associée à une niche (ex. « Béton — Boston MA ») et à un montant affiché avant acceptation. Une fois la charte d&apos;engagement signée électroniquement, la fiche Google cible est révélée à l&apos;agent. L&apos;agent rédige et publie un avis sincère, en ses propres mots, depuis son propre compte Google, puis transmet une capture d&apos;écran comme preuve. La validation intervient après 14 jours de survie de l&apos;avis en ligne.</p>
        </section>

        <section>
          <h2>5. Rémunération</h2>
          <p>La rémunération est versée chaque vendredi pour les avis validés. Un avis retiré par Google dans le délai de 14 jours n&apos;est pas rémunéré. Les montants sont : STARTER 2 $, BRONZE 3 $, SILVER 4 $, OR 5 $. Ces montants sont libellés en dollars canadiens (CAD) ou en dollars américains (USD) selon la résidence de l&apos;agent. Les gains sont des exemples, pas des garanties.</p>
        </section>

        <section>
          <h2>6. Obligations de l&apos;agent</h2>
          <ul>
            <li>Publier des avis sincères, en ses propres mots, reflétant sa connaissance réelle de l&apos;entreprise ou du secteur géographique ;</li>
            <li>Ne jamais publier plusieurs avis pour la même fiche ;</li>
            <li>Ne pas divulguer les fiches cibles à des tiers ;</li>
            <li>Respecter les règles des plateformes Google concernant les avis.</li>
          </ul>
        </section>

        <section>
          <h2>7. Propriété intellectuelle</h2>
          <p>Le contenu de la Plateforme (design, textes, logiciels) est protégé par le droit d&apos;auteur. Les avis rédigés par les agents restent la propriété de leurs auteurs respectifs.</p>
        </section>

        <section>
          <h2>8. Limitation de responsabilité</h2>
          <p>{BRAND_LEGAL} n&apos;est pas affiliée à Google LLC. Google Business Profile est une marque déposée de Google LLC. La Plateforme ne garantit pas que les avis resteront publiés, ni qu&apos;ils auront un impact particulier sur le référencement des fiches ciblées. La Plateforme ne peut être tenue responsable d&apos;éventuelles modifications des politiques de Google.</p>
        </section>

        <section>
          <h2>9. Résiliation</h2>
          <p>La Plateforme peut suspendre ou résilier l&apos;accès d&apos;un agent en cas de fraude, de violation des présentes conditions ou de comportement contraire à l&apos;éthique. L&apos;agent peut quitter la Plateforme à tout moment. Les gains déjà validés restent dus.</p>
        </section>

        <section>
          <h2>10. Droit applicable</h2>
          <p>Les présentes conditions sont régies par le droit applicable à la juridiction du siège social de {BRAND_LEGAL}. Tout différend sera soumis aux tribunaux compétents.</p>
        </section>

        <section>
          <h2>11. Contact</h2>
          <p>Pour toute question relative aux présentes conditions, contactez-nous via la page <a href="/contact">Contact</a>.</p>
        </section>
      </div>
    </main>
  )
}
