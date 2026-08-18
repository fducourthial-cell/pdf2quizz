// app/dashboard/page.tsx
'use client';

import React, { useState } from 'react';
import Dropzone from '@/components/Dropzone'; // Ajuste le chemin d'import selon ton dossier
import QuizSettings, { QuizConfig } from '@/components/QuizSettings';

export default function NewQuizPage() {
  // État pour stocker le fichier PDF uploadé
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  // État pour gérer le chargement lors de l'appel API (Phase 3)
  const [isGenerating, setIsGenerating] = useState(false);

  // Callback quand la Dropzone valide un fichier
  const handleFileAccepted = (file: File) => {
    setPdfFile(file);
  };

  // Callback quand l'utilisateur clique sur "Générer le Quiz"
  const handleGenerateQuiz = async (settings: QuizConfig) => {
    if (!pdfFile) return;

    setIsGenerating(true);
    
    // Pour le moment, on affiche juste les données dans la console
    console.log("🚀 Lancement de la génération !");
    console.log("Fichier :", pdfFile.name);
    console.log("Paramètres :", settings);

    // TODO: Phase 3 - Upload vers Supabase Storage & Appel API Gemini
    
    // Simulation d'attente pour le moment...
    setTimeout(() => {
      setIsGenerating(false);
      alert("Simulation : Quiz généré avec succès !");
    }, 2000);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Créer un nouveau quiz</h1>
        <p className="text-gray-500">Importez un document PDF et laissez l'IA concevoir vos questions sur-mesure.</p>
      </header>

      {/* Rendu conditionnel : si on génère, on affiche un écran d'attente */}
      {isGenerating ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Analyse du document en cours...</h2>
          <p className="text-gray-500 text-center max-w-sm">
            Notre IA extrait les concepts clés et rédige vos questions. Cette opération peut prendre quelques secondes.
          </p>
        </div>
      ) : (
        <>
          {/* Composant Dropzone */}
          <div className="mb-6">
            <Dropzone onFileAccepted={handleFileAccepted} />
          </div>

          {/* Composant Paramètres (le bouton est désactivé si pdfFile est null) */}
          <QuizSettings 
            isSubmitDisabled={!pdfFile} 
            onSubmit={handleGenerateQuiz} 
          />
        </>
      )}

    </div>
  );
}
