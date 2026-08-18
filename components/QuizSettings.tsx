// components/QuizSettings.tsx
'use client';

import React, { useState } from 'react';
import { Settings2, Zap } from 'lucide-react';

interface QuizSettingsProps {
  isSubmitDisabled: boolean;
  onSubmit: (settings: QuizConfig) => void;
}

export type QuizConfig = {
  type: string;
  difficulty: string;
  questionCount: number;
};

export default function QuizSettings({ isSubmitDisabled, onSubmit }: QuizSettingsProps) {
  // États locaux pour le formulaire
  const [quizType, setQuizType] = useState('qcm');
  const [difficulty, setDifficulty] = useState('intermediaire');
  const [questionCount, setQuestionCount] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type: quizType,
      difficulty,
      questionCount
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Settings2 size={20} className="text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900">Personnalisation de l'IA</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Type de Quiz */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Format attendu</label>
          <select 
            value={quizType}
            onChange={(e) => setQuizType(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none transition-colors"
          >
            <option value="qcm">QCM (Choix multiples)</option>
            <option value="flashcards">Flashcards (Révision)</option>
            <option value="vrai_faux">Vrai ou Faux</option>
          </select>
        </div>

        {/* Niveau de Difficulté */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Niveau de difficulté</label>
          <select 
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none transition-colors"
          >
            <option value="debutant">Débutant (Vulgarisation)</option>
            <option value="intermediaire">Intermédiaire (Standard)</option>
            <option value="expert">Expert (Détails techniques)</option>
          </select>
        </div>

        {/* Nombre de questions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de questions</label>
          <select 
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none transition-colors"
          >
            <option value={5}>5 questions (Rapide)</option>
            <option value={10}>10 questions (Recommandé)</option>
            <option value={15}>15 questions (Complet)</option>
            <option value={20}>20 questions (Examen)</option>
          </select>
        </div>
      </div>

      {/* Bouton de soumission */}
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all
            ${isSubmitDisabled 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'}
          `}
        >
          <Zap size={18} className={isSubmitDisabled ? 'text-gray-400' : 'text-blue-200'} />
          Générer le Quiz
        </button>
      </div>
    </form>
  );
}
