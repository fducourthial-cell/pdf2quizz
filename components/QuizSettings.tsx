// components/QuizSettings.tsx
'use client';

import React, { useState } from 'react';
import { Settings2, Zap, Clock } from 'lucide-react';

interface QuizSettingsProps {
  isSubmitDisabled: boolean;
  onSubmit: (settings: QuizConfig) => void;
}

export type QuizConfig = {
  type: string;
  difficulty: string;
  questionCount: number;
  // NOUVEAU : On ajoute les données du chrono dans la configuration exportée
  timerMode: 'none' | 'auto' | 'custom';
  customMinutes: number;
};

export default function QuizSettings({ isSubmitDisabled, onSubmit }: QuizSettingsProps) {
  // États locaux pour le formulaire
  const [quizType, setQuizType] = useState('qcm');
  const [difficulty, setDifficulty] = useState('intermediaire');
  const [questionCount, setQuestionCount] = useState(10);
  
  // NOUVEAU : États pour le chronomètre
  const [timerMode, setTimerMode] = useState<'none' | 'auto' | 'custom'>('none');
  const [customMinutes, setCustomMinutes] = useState<number>(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type: quizType,
      difficulty,
      questionCount,
      timerMode,
      customMinutes
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Settings2 size={20} className="text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900">Personnalisation de l'évaluation</h3>
      </div>

      {/* MODIFICATION : Passage en grille 2x2 (md:grid-cols-2) pour équilibrer les 4 champs */}
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
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

        {/* NOUVEAU : Chronomètre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Clock size={14} className="text-gray-500"/> Limite de temps
          </label>
          <div className="flex gap-2">
            <select 
              value={timerMode}
              onChange={(e) => setTimerMode(e.target.value as 'none' | 'auto' | 'custom')}
              className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none transition-colors"
            >
              <option value="none">Aucun (Temps libre)</option>
              <option value="auto">Auto</option>
              <option value="custom">Personnalisé</option>
            </select>
            
            {/* Saisie des minutes qui s'affiche uniquement si "Personnalisé" est sélectionné */}
            {timerMode === 'custom' && (
              <div className="flex items-center gap-2 w-24">
                <input 
                  type="number" 
                  min="1" 
                  value={customMinutes} 
                  onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg text-center focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none transition-colors"
                />
                <span className="text-sm text-gray-500 font-medium">min</span>
              </div>
            )}
          </div>
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
          Générer l'évaluation
        </button>
      </div>
    </form>
  );
}
