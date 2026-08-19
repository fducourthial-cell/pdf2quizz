// app/quiz/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, RotateCcw, Award, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
  const [loading, setLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    async function fetchQuiz() {
      if (!quizId) return;
      try {
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();

        if (error) throw error;
        if (data) setQuiz(data);
      } catch (err) {
        console.error("Erreur lors du chargement du quiz :", err);
      } finally {
        setLoading(false);
      }
    }

    fetchQuiz();
  }, [quizId]);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quiz introuvable</h2>
        <Link href="/bibliotheque" className="text-blue-600 hover:underline">Retourner à la bibliothèque</Link>
      </div>
    );
  }

  const questions: Question[] = quiz.questions || [];

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="mb-6">
        <Link href="/bibliotheque" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition">
          <ArrowLeft size={16} /> Retour à mes quiz
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{quiz.title || "Quiz"}</h1>
        <p className="text-gray-500">Répondez aux questions ci-dessous et testez vos connaissances.</p>
      </header>

      <div className="space-y-6">
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
                  if (isCorrect) {
                    optionStyle = "border-green-500 bg-green-50 text-green-900 font-medium";
                  } else if (isSelected && !isCorrect) {
                    optionStyle = "border-red-300 bg-red-50 text-red-900";
                  }
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
                  Vous avez obtenu {calculateScore()} / {questions.length} bonnes réponses.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowResults(false);
                setSelectedAnswers({});
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition border border-gray-700 flex items-center gap-2"
            >
              <RotateCcw size={16} /> Recommencer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
