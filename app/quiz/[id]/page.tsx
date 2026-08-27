// app/quiz/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, RotateCcw, Award, ArrowLeft, Download, Clock } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export default function PlayQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id;

  const [quiz, setQuiz] = useState<any>(null);
  const [userName, setUserName] = useState<string>('Apprenant');
  const [loading, setLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // --- NOUVEAUX ÉTATS POUR LE CHRONOMÈTRE ---
  const [quizStarted, setQuizStarted] = useState(false);
  const [timerMode, setTimerMode] = useState<'none' | 'auto' | 'custom'>('none');
  const [customMinutes, setCustomMinutes] = useState<number>(5);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    async function fetchQuizAndUser() {
      if (!quizId) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Apprenant');
        }

        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();

        if (error) throw error;
        if (data) setQuiz(data);
      } catch (err) {
        console.error("Erreur lors du chargement :", err);
      } finally {
        setLoading(false);
      }
    }

    fetchQuizAndUser();
  }, [quizId]);

  // --- LOGIQUE DU CHRONOMÈTRE ---
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResults) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev <= 1) {
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, showResults]);

  // Déclenchement de la validation automatique à 0
  useEffect(() => {
    if (timeLeft === 0 && !showResults) {
      handleValidate();
      alert("⏳ Temps écoulé ! Vos réponses ont été validées automatiquement.");
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartQuiz = () => {
    if (!quiz || !quiz.questions) return;
    
    if (timerMode === 'auto') {
      setTimeLeft(quiz.questions.length * 30); // 30s par question
    } else if (timerMode === 'custom') {
      setTimeLeft(customMinutes * 60); // Conversion minutes en secondes
    } else {
      setTimeLeft(null); // Pas de limite
    }
    setQuizStarted(true);
  };
  // ------------------------------

  const handleSelectOption = (questionIndex: number, option: string) => {
    if (showResults) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: option
    }));
  };

  const calculateScore = () => {
    if (!quiz || !quiz.questions) return 0;
    let score = 0;
    quiz.questions.forEach((q: Question, idx: number) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });
    return score;
  };

 const handleValidate = async () => {
    if (!quiz || !quiz.questions) return;
    
    const correctCount = calculateScore();
    const totalQuestions = quiz.questions.length;
    const percentage = (correctCount / totalQuestions) * 100;
    const isPassed = percentage >= 80;

    try {
      // 1. On attend que Supabase ait bien enregistré les données
      const { error } = await supabase
        .from('quizzes')
        .update({ score: correctCount, passed: isPassed })
        .eq('id', quizId);

      if (error) throw error;

      // 2. On met à jour l'état local du quiz pour que l'UI soit synchrone immédiatement
      setQuiz((prev: any) => ({
        ...prev,
        score: correctCount,
        passed: isPassed
      }));

    } catch (err) {
      console.error("Erreur lors de la sauvegarde :", err);
    } finally {
      // 3. On affiche les résultats seulement après l'enregistrement
      setShowResults(true);
    }
  };

  const exportCertificate = async () => {
    const certificateElement = document.getElementById('certificate-template');
    if (!certificateElement) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(certificateElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificat_${quiz.title || 'FormaGen'}.pdf`);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF :", error);
      alert("Une erreur est survenue lors de la création du certificat.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!quiz) return <div className="text-center py-12">Quiz introuvable</div>;

  const questions: Question[] = quiz.questions || [];
  const finalScore = calculateScore();
  const finalPercentage = Math.round((finalScore / questions.length) * 100);
  const isPassed = finalPercentage >= 80;

  return (
    <div className="max-w-3xl mx-auto pb-16 relative pt-8 px-4 sm:px-0">
      <div className="mb-6">
        <Link href="/bibliotheque" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition">
          <ArrowLeft size={16} /> Retour à mes évaluations
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{quiz.title || "Évaluation professionnelle"}</h1>
        <p className="text-gray-500">Validation des connaissances et certification.</p>
      </header>

      {/* 1. ÉCRAN DE CONFIGURATION (Avant de démarrer) */}
      {!quizStarted ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuration de l'évaluation</h2>
          <p className="text-gray-500 mb-8">Ce test contient {questions.length} questions. Définissez la limite de temps accordée :</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
            <button 
              onClick={() => setTimerMode('none')}
              className={`p-4 rounded-xl border-2 transition ${timerMode === 'none' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
            >
              <h3 className="font-semibold text-gray-900">Aucune limite</h3>
              <p className="text-xs text-gray-500 mt-1">L'apprenant prend son temps</p>
            </button>

            <button 
              onClick={() => setTimerMode('auto')}
              className={`p-4 rounded-xl border-2 transition ${timerMode === 'auto' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
            >
              <h3 className="font-semibold text-gray-900">Automatique</h3>
              <p className="text-xs text-gray-500 mt-1">30s par question ({formatTime(questions.length * 30)})</p>
            </button>

            <div className={`p-4 rounded-xl border-2 transition flex flex-col justify-between ${timerMode === 'custom' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
              <button onClick={() => setTimerMode('custom')} className="text-left">
                <h3 className="font-semibold text-gray-900">Personnalisé</h3>
                <p className="text-xs text-gray-500 mt-1">Durée au choix</p>
              </button>
              {timerMode === 'custom' && (
                <div className="mt-3 flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1" 
                    value={customMinutes} 
                    onChange={(e) => setCustomMinutes(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center outline-none focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-600">min</span>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={handleStartQuiz}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md transition"
          >
            Démarrer le test
          </button>
        </div>
      ) : (
        /* 2. LE QUIZ EN LUI-MÊME */
        <div className="space-y-6">
          
          {/* BANDEAU CHRONOMÈTRE STICKY */}
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

          {/* LISTE DES QUESTIONS */}
          {questions.map((q, qIndex) => (
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
              <button onClick={handleValidate} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md transition">
                Valider mes réponses
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-6">
              <div className={`text-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between shadow-lg ${isPassed ? 'bg-green-900' : 'bg-gray-900'}`}>
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                  <div className={`p-3 rounded-xl text-white ${isPassed ? 'bg-green-600' : 'bg-blue-600'}`}>
                    {isPassed ? <CheckCircle2 size={32} /> : <Award size={32} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-xl">{isPassed ? "Félicitations, c'est un succès !" : "Résultat final"}</h4>
                    <p className="text-sm opacity-90 mt-1">
                      Score : {finalScore} / {questions.length} ({finalPercentage}%)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  {isPassed && (
                    <button
                      onClick={exportCertificate}
                      disabled={isDownloading}
                      className="flex-1 md:flex-none px-4 py-2.5 bg-white text-green-900 text-sm font-bold rounded-lg hover:bg-green-50 transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <Download size={18} />
                      {isDownloading ? "Génération..." : "Mon Certificat"}
                    </button>
                  )}
                  <button
                    onClick={() => { 
                      setShowResults(false); 
                      setSelectedAnswers({}); 
                      setQuizStarted(false); // On retourne à l'écran de config du chrono
                    }}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-black/30 hover:bg-black/50 text-white text-sm font-medium rounded-lg transition border border-white/20 flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={16} /> Rejouer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODÈLE CACHÉ DU CERTIFICAT (Généré pour le PDF) */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div 
          id="certificate-template" 
          className="w-[1123px] h-[794px] bg-white relative flex flex-col items-center justify-center font-sans text-gray-900"
          style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")', border: '24px solid #2563eb' }}
        >
          {/* Cadre intérieur */}
          <div className="absolute inset-8 border-4 border-blue-600/30 rounded-2xl pointer-events-none"></div>

          {/* Contenu principal */}
          <div className="flex flex-col items-center justify-center w-full mt-[-60px] px-24 text-center">
            {/* Logo / Badge de validation */}
            <div className="mb-6">
              <svg className="w-28 h-28 text-green-500 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l5.59-5.59L18 10l-7 7z"/>
              </svg>
            </div>

            <h1 className="text-6xl font-black text-blue-900 mb-3 tracking-tight uppercase">Certificat de Réussite</h1>
            <p className="text-xl text-gray-600 mb-10">Ce document certifie formellement que</p>
            
            <h2 className="text-5xl font-bold text-gray-900 mb-10 pb-4 border-b-2 border-gray-300 px-16 inline-block">
              {userName}
            </h2>

            <p className="text-xl text-gray-600 mb-4">A complété avec succès l'évaluation :</p>
            <h3 className="text-4xl font-bold text-blue-700 max-w-4xl leading-tight">
              "{quiz.title || 'Évaluation FormaGen'}"
            </h3>
          </div>

          {/* Footer */}
          <div className="absolute bottom-20 left-24 right-24 flex justify-between items-end">
            <div className="flex items-center gap-12">
              <div className="text-left">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Score Obtenu</p>
                <p className="text-4xl font-black text-green-600">{finalPercentage}%</p>
              </div>
              <div className="w-px h-12 bg-gray-300"></div>
              <div className="text-left">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Date d'obtention</p>
                <p className="text-2xl font-bold text-gray-800">
                  {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-bold text-gray-400 mb-1">Généré et certifié par</p>
              <p className="text-3xl font-black text-blue-600 tracking-tight">FormaGen</p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
