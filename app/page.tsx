// app/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link'; 
import Dropzone from '@/components/Dropzone';
import QuizSettings, { QuizConfig } from '@/components/QuizSettings';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, XCircle, RotateCcw, Award, LogOut, Mail, Lock, Clock } from 'lucide-react'; // Ajout de Clock

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export default function NewQuizPage() {
  // --- ÉTATS D'AUTHENTIFICATION ---
  const [session, setSession] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  // --- ÉTATS DU QUIZ ---
  const [file, setFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [quizQuestions, setQuizQuestions] = useState<Question[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);

  // --- NOUVEAUX ÉTATS : ANIMATION & CHRONOMÈTRE ---
  const [loadingStep, setLoadingStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // Le temps restant en secondes
  
  const loadingMessages = [
    "Analyse du document par l'IA...",
    "Identification des concepts clés...",
    "Rédaction des questions sur-mesure...",
    "Génération des explications pédagogiques...",
    "Finalisation de l'évaluation..."
  ];

  // --- GESTION DU CHRONOMÈTRE (Décompte et validation auto) ---
  useEffect(() => {
    // Si pas de temps défini, ou temps à 0, ou quiz déjà validé = on ne fait rien
    if (timeLeft === null || timeLeft <= 0 || showResults) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev <= 1) {
          setShowResults(true); // Le temps est écoulé : Validation automatique !
          alert("⏳ Temps écoulé ! Vos réponses ont été validées automatiquement.");
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timerId); // Nettoyage
  }, [timeLeft, showResults]);

  // Convertit "130" secondes en "02:10"
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- ANIMATION D'ATTENTE ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating && uploadStatus === 'AI_PHASE') {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, uploadStatus]);

  // --- AUTHENTIFICATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    if (!acceptPrivacy) return alert("Veuillez accepter la politique de confidentialité pour continuer.");
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      if (error) throw error;
    } catch (error) {
      console.error("Erreur Google :", error);
      alert("Impossible de se connecter avec Google.");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptPrivacy) return alert("Veuillez accepter la politique de confidentialité pour continuer.");
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Inscription réussie ! Vérifiez vos emails pour confirmer votre compte.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      alert(error.message || "Une erreur est survenue lors de l'authentification.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- FONCTIONS DU QUIZ ---
  const handleFileAccepted = (acceptedFile: File) => {
    setFile(acceptedFile);
    setQuizQuestions(null);
    setSelectedAnswers({});
    setShowResults(false);
    setTimeLeft(null); // On reset le chrono
  };

  const handleGenerateQuiz = async (settings: QuizConfig) => {
    if (!file) return;

    try {
      setIsGenerating(true);
      setUploadStatus('Sécurisation et envoi du fichier...'); 
      
      const fileExt = file.name.split('.').pop();
      const cleanFileName = `quiz-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(cleanFileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw new Error(`Erreur d'upload : ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(cleanFileName);

      setLoadingStep(0);
      setUploadStatus('AI_PHASE'); 

      const apiResponse = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl: publicUrl, settings: settings }),
      });

      const data = await apiResponse.json();
      if (!apiResponse.ok) throw new Error(data.error || 'Erreur lors de la génération du quiz');

      // --- LE QUIZ EST VALIDÉ ---
      setQuizQuestions(data.quiz);
      
      // Initialisation du chrono depuis les paramètres
      if (settings.timerMode === 'auto') {
        setTimeLeft(settings.questionCount * 30);
      } else if (settings.timerMode === 'custom') {
        setTimeLeft(settings.customMinutes * 60);
      } else {
        setTimeLeft(null);
      }

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
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: option }));
  };

  const calculateScore = () => {
    if (!quizQuestions) return 0;
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) score++;
    });
    return score;
  };

  const handleReset = () => {
    setFile(null);
    setQuizQuestions(null);
    setSelectedAnswers({});
    setShowResults(false);
    setTimeLeft(null); // On reset le chrono
  };

  // ==========================================
  // L'INTERFACE
  // ==========================================
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto pt-16 pb-16">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h1>
            <p className="text-gray-500 text-sm">Connectez-vous pour générer vos évaluations sur-mesure.</p>
          </div>
          {/* ... (Formulaire de connexion inchangé) ... */}
          <div className="mb-6 flex items-start bg-gray-50 p-3 rounded-lg border border-gray-200">
            <input type="checkbox" id="privacy" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" />
            <label htmlFor="privacy" className="ml-3 text-sm text-gray-600 cursor-pointer">
              J'ai lu et j'accepte la <Link href="/confidentialite" target="_blank" className="text-blue-600 hover:underline font-medium">Politique de confidentialité</Link>
            </label>
          </div>
          <button onClick={handleGoogleLogin} disabled={!acceptPrivacy} className={`w-full flex items-center justify-center gap-3 px-4 py-3 border rounded-xl transition font-medium mb-6 ${acceptPrivacy ? "border-gray-300 hover:bg-gray-50 text-gray-700" : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className={`w-5 h-5 ${!acceptPrivacy && 'opacity-50'}`} /> Continuer avec Google
          </button>
          <div className="relative flex items-center py-4 mb-2">
            <div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink-0 px-4 text-gray-400 text-sm">Ou avec votre email</span><div className="flex-grow border-t border-gray-200"></div>
          </div>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Mail size={18} /></div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="vous@exemple.fr" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Lock size={18} /></div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="••••••••" required />
              </div>
            </div>
            <button type="submit" disabled={!acceptPrivacy} className={`w-full py-3 rounded-xl font-medium transition ${acceptPrivacy ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-300 text-white cursor-not-allowed"}`}>
              {isSignUp ? "Créer mon compte" : "Se connecter"}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-blue-600 hover:underline">{isSignUp ? "Déjà un compte ? Connectez-vous" : "Pas encore de compte ? Inscrivez-vous"}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl w-full px-4 sm:px-6 md:px-8 mx-auto pb-16 pt-8 min-h-screen flex flex-col">
      <div className="flex-grow">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Créer une nouvelle évaluation</h1>
            <p className="text-gray-500">Importez un document (PDF) ou une image (PNG, JPG).</p>
          </div>
        </header>

        {isGenerating ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Génération en cours</h2>
            <p className="text-gray-600 text-center max-w-sm font-medium animate-pulse">
              {uploadStatus === 'AI_PHASE' ? loadingMessages[loadingStep] : uploadStatus}
            </p>
          </div>
        ) : quizQuestions ? (
          <div className="space-y-6">
            
            {/* --- NOUVEAU : LE BANDEAU CHRONOMÈTRE INTÉGRÉ --- */}
            <div className="sticky top-4 z-10 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <h2 className="font-bold text-gray-900">Évaluation en cours</h2>
                <p className="text-xs text-gray-500">Répondez à toutes les questions</p>
              </div>
              {timeLeft !== null && !showResults && (
                <div className={`px-4 py-2 rounded-lg font-mono font-bold text-lg flex items-center gap-2 transition-colors ${timeLeft <= 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-900 text-white'}`}>
                  <Clock size={18} /> {formatTime(timeLeft)}
                </div>
              )}
              {showResults && (
                <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold text-sm">
                  Terminé
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-blue-900">Test prêt !</h2>
                <p className="text-sm text-blue-700">Sélectionnez les bonnes réponses ci-dessous.</p>
              </div>
              <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium">
                <RotateCcw size={16} /> Nouveau Test
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
                      <button key={oIndex} onClick={() => handleSelectOption(qIndex, option)} className={`w-full text-left p-3.5 rounded-xl border transition-all text-sm flex items-center justify-between ${optionStyle}`}>
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
                <button onClick={() => setShowResults(true)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md transition">
                  Valider mes réponses
                </button>
              </div>
            ) : (
              <div className={`bg-gray-900 text-white rounded-2xl p-6 shadow-lg border-2 transition-all ${calculateScore() === quizQuestions.length ? 'border-yellow-500' : 'border-gray-800'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl text-white ${calculateScore() === quizQuestions.length ? 'bg-yellow-500' : 'bg-blue-600'}`}>
                      <Award size={28} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xl">Résultat final</h4>
                      <p className="text-base text-gray-300">
                        Vous avez obtenu <span className="font-bold text-white">{calculateScore()} / {quizQuestions.length}</span> bonnes réponses.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { setShowResults(false); setSelectedAnswers({}); setTimeLeft(null); }} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition border border-gray-700 whitespace-nowrap">
                    Recommencer
                  </button>
                </div>
                {calculateScore() === quizQuestions.length && (
                  <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="text-yellow-500 shrink-0" size={24} />
                    <div>
                      <h5 className="text-yellow-500 font-bold">Certification validée ! 🏆</h5>
                      <p className="text-sm text-yellow-500/80 mt-1">Félicitations, vous avez maîtrisé ce sujet à 100 %. Votre validation est acquise.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <Dropzone onFileAccepted={handleFileAccepted} />
            </div>
            <QuizSettings isSubmitDisabled={!file} onSubmit={handleGenerateQuiz} />
          </>
        )}
      </div>
      <footer className="mt-16 pt-8 border-t border-gray-200 text-center">
        <Link href="/confidentialite" className="text-sm text-gray-400 hover:text-gray-600 transition">Politique de confidentialité</Link>
      </footer>
    </div>
  );
}
