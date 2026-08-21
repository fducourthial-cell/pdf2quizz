// app/bibliotheque/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Calendar, ArrowRight, Trash2, Edit2, Check, X } from 'lucide-react';
import Link from 'next/link';

interface QuizItem {
  id: string;
  created_at: string;
  title: string;
  pdf_url: string;
  questions: any[];
  score?: number;
  passed?: boolean; 
  is_trashed?: boolean;
}

export default function BibliothequePage() {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);

  // États pour gérer l'édition du nom d'un quiz
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState<string>('');

  // Charger les quiz depuis Supabase
  useEffect(() => {
    async function fetchQuizzes() {
      try {
        // On récupère uniquement les quiz qui NE SONT PAS dans la corbeille
        // On utilise is() pour gérer les anciennes lignes où is_trashed est null
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .or('is_trashed.is.null,is_trashed.eq.false')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setQuizzes(data);
      } catch (err) {
        console.error("Erreur lors du chargement des quiz :", err);
      } finally {
        setLoading(false);
      }
    }

    fetchQuizzes();
  }, []);

  // Activer le mode édition pour un quiz
  const handleStartEdit = (quiz: QuizItem, e: React.MouseEvent) => {
    e.preventDefault();
    setEditingId(quiz.id);
    setNewTitle(quiz.title || '');
  };

  // Sauvegarder le nouveau nom dans Supabase
  const handleSaveTitle = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ title: newTitle })
        .eq('id', id);

      if (error) throw error;

      // Mettre à jour l'état local
      setQuizzes(quizzes.map(q => q.id === id ? { ...q, title: newTitle } : q));
      setEditingId(null);
    } catch (err) {
      console.error("Erreur lors de la modification du titre :", err);
      alert("Erreur lors de la mise à jour du titre.");
    }
  };

  // Fonction pour envoyer un quiz à la corbeille (Soft Delete)
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    // Le message est plus doux puisqu'on sait qu'on peut récupérer le quiz
    if (!confirm("Voulez-vous envoyer ce quiz à la corbeille ?")) return;

    try {
      // Au lieu de delete(), on fait un update
      const { error } = await supabase
        .from('quizzes')
        .update({ is_trashed: true })
        .eq('id', id);

      if (error) throw error;
      
      // On retire le quiz de l'affichage local de la bibliothèque
      setQuizzes(quizzes.filter(q => q.id !== id));
    } catch (err) {
      console.error("Erreur lors de l'envoi à la corbeille :", err);
      alert("Erreur lors de la suppression du quiz.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Quiz</h1>
        <p className="text-gray-500">Retrouvez l'historique de tous les quiz générés à partir de vos PDF.</p>
      </header>

      {loading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Aucun quiz pour le moment</h3>
          <p className="text-sm text-gray-500 mb-6">Importez votre premier PDF pour générer un quiz sur-mesure.</p>
          <Link 
            href="/"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition"
          >
            Créer un quiz
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((quiz) => {
            const isEditing = editingId === quiz.id;

            return (
              <div 
                key={quiz.id}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-blue-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3 gap-2">
                    
                    {/* Zone de gauche : Nombre de questions + Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                        {quiz.questions?.length || 0} questions
                      </span>

                      {quiz.passed && (
                        <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium border border-green-200 shadow-sm" title="Quiz réussi avec 80% ou plus !">
                          <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l5.59-5.59L18 10l-7 7z"/>
                          </svg>
                          <span>Validé</span>
                        </div>
                      )}
                    </div>

                    {/* Zone de droite : Boutons Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!isEditing && (
                        <button 
                          onClick={(e) => handleStartEdit(quiz, e)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Modifier le nom"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      <button 
                        onClick={(e) => handleDelete(quiz.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Envoyer à la corbeille"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Affichage du titre ou de l'input d'édition */}
                  {isEditing ? (
                    <div className="flex items-center gap-2 mb-3">
                      <input 
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-3 py-1.5 border border-blue-500 rounded-lg text-sm outline-none bg-blue-50/30"
                        autoFocus
                      />
                      <button 
                        onClick={(e) => handleSaveTitle(quiz.id, e)}
                        className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        title="Valider"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); setEditingId(null); }}
                        className="p-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        title="Annuler"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-1">
                      {quiz.title || "Quiz sans titre"}
                    </h3>
                  )}

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
                  <Link 
                    href={`/quiz/${quiz.id}`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                  >
                    Jouer <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
