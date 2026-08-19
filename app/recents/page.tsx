// app/recents/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, Calendar, ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';

interface QuizItem {
  id: string;
  created_at: string;
  title: string;
  pdf_url: string;
  questions: any[];
}

export default function RecentsPage() {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentQuizzes() {
      try {
        // Date d'il y a 7 jours
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setQuizzes(data);
      } catch (err) {
        console.error("Erreur lors du chargement des quiz récents :", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentQuizzes();
  }, []);

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Récents</h1>
        <p className="text-gray-500">Retrouvez les quiz générés au cours des 7 derniers jours.</p>
      </header>

      {loading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <Clock size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Aucun quiz récent</h3>
          <p className="text-sm text-gray-500 mb-6">Vous n'avez pas créé de quiz cette semaine.</p>
          <Link 
            href="/"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition"
          >
            Créer un quiz
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((quiz) => (
            <div 
              key={quiz.id}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-blue-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                    {quiz.questions?.length || 0} questions
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-1">
                  {quiz.title || "Quiz sans titre"}
                </h3>

                <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
                  <Calendar size={14} />
                  <span>{new Date(quiz.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <a 
                  href={quiz.pdf_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-blue-600 underline truncate max-w-[180px]"
                >
                  Voir le PDF source
                </a>
                <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
                  Actif <ArrowRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
