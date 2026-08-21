// app/confidentialite/page.tsx
import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 text-gray-800">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Politique de Confidentialité</h1>
      <p className="mb-8 text-sm text-gray-500">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900">1. Introduction</h2>
          <p>
            Bienvenue sur FormaGen. La protection de vos données personnelles et professionnelles est notre priorité. 
            Cette politique de confidentialité vous explique quelles données nous collectons, comment nous les utilisons et comment nous les protégeons, conformément au Règlement Général sur la Protection des Données (RGPD).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900">2. Données collectées</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Données de compte :</strong> Lors de votre inscription (via Google ou Email), nous collectons votre adresse e-mail et votre nom afin de créer et sécuriser votre compte.</li>
            <li><strong>Contenus importés :</strong> Pour générer vos évaluations, vous importez des fichiers (PDF, PNG, JPG). Ces fichiers sont stockés de manière sécurisée.</li>
            <li><strong>Données générées :</strong> Les questions, réponses et quiz générés par l'Intelligence Artificielle sont sauvegardés pour vous permettre d'y accéder depuis votre bibliothèque.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900">3. Utilisation de l'Intelligence Artificielle (IA)</h2>
          <p>
            FormaGen utilise l'API de Google (Gemini) pour analyser vos documents et générer les évaluations. 
            Vos documents sont transmis de manière sécurisée et chiffrée à ce service partenaire dans le seul but de traiter votre demande. 
            Conformément aux conditions de l'API Google Cloud, <strong>vos documents privés ne sont pas utilisés par Google pour entraîner ses modèles d'IA publics.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900">4. Hébergement et Sécurité</h2>
          <p>
            Notre infrastructure (bases de données, authentification et stockage des fichiers) est gérée par <strong>Supabase</strong>, un fournisseur reconnu pour ses standards de sécurité stricts. 
            Les communications entre votre appareil et nos serveurs sont chiffrées (HTTPS/TLS).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900">5. Conservation des données</h2>
          <p>
            Nous conservons vos documents et les quiz générés tant que votre compte est actif, afin que vous puissiez y accéder dans votre historique. 
            Vous pouvez à tout moment supprimer un quiz ou demander la suppression complète de votre compte et de l'intégralité de vos fichiers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900">6. Vos droits (RGPD)</h2>
          <p>
            Conformément à la réglementation européenne, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. 
            Pour exercer ces droits, vous pouvez nous contacter à l'adresse suivante : <strong>f.ducourthial@gmail.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
