// app/page.tsx
'use client';

import React, { useState } from 'react';
import Dropzone from '@/components/Dropzone';
import QuizSettings, { QuizConfig } from '@/components/QuizSettings';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, XCircle, RotateCcw, Award } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export default function NewQuizPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  
  // États pour le quiz interactif
  const [quizQuestions, setQuizQuestions] = useState<Question[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);

  const handleFileAccepted = (file: File) => {
    setPdfFile(file);
    setQuizQuestions(null);
    setSelectedAnswers({});
    setShowResults(false);
  };

  const handleGenerateQuiz = async (settings: QuizConfig) => {
    if (!pdfFile) return;

    try {
      setIsGenerating(true);
      
      // --- ÉTAPE 1 : Upload vers Supabase Storage ---
      setUploadStatus('Envoi du PDF vers le cloud...');
      const cleanFileName = `quiz-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(cleanFileName, pdfFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Erreur d'upload : ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('pdfs')
        .getPublicUrl(cleanFileName);

      // --- ÉTAPE 2 : Appel de l'API Gemini ---
      setUploadStatus('Analyse du document par l\'IA (cela peut prendre 30s)...');

      const apiResponse = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pdfUrl: publicUrl, 
          settings: settings 
        }),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.error || 'Erreur lors de la génération du quiz');
      }

      setQuizQuestions(data.quiz);

    } catch (error: any) {
      console.error(error);
      alert(error.message || "Une erreur est survenue.");
    } finally {
      setIsGenerating(false);
      setUploadStatus('');
    }
  };

  const handleSelectOption = (questionIndex: number, option: string) => {
    if (showResults) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: option
    }));
  };

  const calculateScore = () => {
    if (!quizQuestions) return 0;
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });
    return score;
  };

  const handleReset = () => {
    setPdfFile(null);
    setQuizQuestions(null);
    setSelectedAnswers({});
    setShowResults(false);
  };

  // --- FONCTION DE CONNEXION GOOGLE ---
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/bibliotheque` 
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Erreur de connexion Google :", error);
      alert("Impossible de se connecter avec Google.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Créer un nouveau quiz</h1>
        <p className="text-gray-500">Importez un document PDF et laissez l'IA concevoir vos questions sur-mesure.</p>
      </header>

      {/* 1. Écran de chargement */}
      {isGenerating ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Génération en cours...</h2>
          <p className="text-gray-500 text-center max-w-sm">
            {uploadStatus}
          </p>
        </div>
      ) : quizQuestions ? (
        /* 2. Affichage du Quiz Interactif */
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900">Quiz prêt !</h2>
              <p className="text-sm text-blue-700">Répondez aux questions ci-dessous et validez vos connaissances.</p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
            >
              <RotateCcw size={16} /> Nouveau Quiz
            </button>
          </div>

          {quizQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 text-base">
                <span className="text-blue-600 mr-2">Q{qIndex + 1}.</span> {q.question}
              </h3>

              <div className="space-y-2 mb-4">
                {q.options.map((option, oIndex) => {
                  const isSelected = selectedAnswers[qIndex] === option;
                  const isCorrect = option === q.correctAnswer;

                  let optionStyle = "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800";
                  if (showResults) {
                    if (isCorrect) optionStyle = "border-green-500 bg-green-50 text-green-900 font-medium";
                    else if (isSelected && !isCorrect) optionStyle = "border-red-300 bg-red-50 text-red-900";
                  } else if (isSelected) {
                    optionStyle = "border-blue-500 bg-blue-50 text-blue-900 font-medium";
                  }

                  return (
                    <button
                      key={oIndex}
                      onClick={() => handleSelectOption(qIndex, option)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all text-sm flex items-center justify-between ${optionStyle}`}
                    >
                      <span>{option}</span>
                      {showResults && isCorrect && <CheckCircle2 size={18} className="text-green-600" />}
                      {showResults && isSelected && !isCorrect && <XCircle size={18} className="text-red-500" />}
                    </button>
                  );
                })}
              </div>

              {showResults && q.explanation && (
                <div className="mt-4 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                  <span className="font-semibold text-gray-900">Explication : </span> {q.explanation}
                </div>
              )}
            </div>
          ))}

          {!showResults ? (
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowResults(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md transition"
              >
                Valider mes réponses
              </button>
            </div>
          ) : (
            <div className="bg-gray-900 text-white rounded-2xl p-6 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-xl text-white">
                  <Award size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Résultat final</h4>
                  <p className="text-sm text-gray-400">
                    Vous avez obtenu {calculateScore()} / {quizQuestions.length} bonnes réponses.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowResults(false);
                  setSelectedAnswers({});
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition border border-gray-700"
              >
                Recommencer
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 3. Écran d'import initial (Dropzone + Paramètres + Connexion) */
        <>
          <div className="mb-6">
            <Dropzone onFileAccepted={handleFileAccepted} />
          </div>

          <QuizSettings 
            isSubmitDisabled={!pdfFile} 
            onSubmit={handleGenerateQuiz} 
          />

          {/* --- NOUVEAU BLOC : BOUTON DE CONNEXION GOOGLE --- */}
          <div className="mt-12 pt-10 border-t border-gray-200 flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sauvegardez vos quiz à vie
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-6">
              Connectez-vous pour retrouver automatiquement vos quiz dans votre bibliothèque et télécharger vos certificats de réussite.
            </p>
            
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 px-6 rounded-xl font-medium transition-colors shadow-sm w-full max-w-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                <path fill="none" d="M1 1h22v22H1z" />
              </svg>
              Continuer avec Google
            </button>
          </div>
        </>
      )}

    </div>
  );
}
