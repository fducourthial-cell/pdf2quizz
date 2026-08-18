// app/dashboard/page.tsx
'use client';

import React, { useState } from 'react';
import Dropzone from '@/components/Dropzone';
import QuizSettings, { QuizConfig } from '@/components/QuizSettings';
import { supabase } from '@/lib/supabase'; // Indispensable pour l'upload

export default function NewQuizPage() {
  // États de l'application
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>(''); // Ajouté !

  // Callback quand la Dropzone valide un fichier
  const handleFileAccepted = (file: File) => {
    setPdfFile(file);
  };

  // Callback quand l'utilisateur clique sur "Générer le Quiz"
  const handleGenerateQuiz = async (settings: QuizConfig) => {
    if (!pdfFile) return;

    try {
      setIsGenerating(true);
      
      // --- ÉTAPE 1 : Upload du fichier sur Supabase Storage ---
      setUploadStatus('Envoi du PDF vers le cloud...');
      const fileExt = pdfFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`; // Nom unique
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, pdfFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Erreur d'upload : ${uploadError.message}`);
      }

      // On récupère l'URL publique du fichier que l'on vient d'uploader
      const { data: { publicUrl } } = supabase.storage
        .from('pdfs')
        .getPublicUrl(filePath);

      console.log("✅ PDF uploadé avec succès ! URL :", publicUrl);

      // --- ÉTAPE 2 : Appel de notre API Next.js (qui va appeler Gemini) ---
      setUploadStatus('Analyse du document par l\'IA (cela peut prendre 30s)...');

      const apiResponse = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pdfUrl: publicUrl, // On utilise l'URL récupérée à l'étape 1
          settings: settings 
        }),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.error || 'Erreur lors de la génération du quiz');
      }

      // --- SUCCÈS ---
      console.log("🎉 Quiz généré avec succès !", data.quiz);
      alert("Quiz généré ! Regarde la console de ton navigateur.");
      // Bientôt : on enregistrera data.quiz dans Supabase Database ici !

    } catch (error: any) {
      console.error(error);
      alert(error.message || "Une erreur est survenue.");
    } finally {
      // On remet l'interface à zéro
      setIsGenerating(false);
      setUploadStatus('');
    }
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Génération en cours...</h2>
          <p className="text-gray-500 text-center max-w-sm">
            {uploadStatus} {/* Affiche l'étape en cours dynamiquement */}
          </p>
        </div>
      ) : (
        <>
          {/* Composant Dropzone */}
          <div className="mb-6">
            <Dropzone onFileAccepted={handleFileAccepted} />
          </div>

          {/* Composant Paramètres */}
          <QuizSettings 
            isSubmitDisabled={!pdfFile} 
            onSubmit={handleGenerateQuiz} 
          />
        </>
      )}

    </div>
  );
}
