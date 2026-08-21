// app/corbeille/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, RefreshCcw, AlertTriangle } from 'lucide-react';

export default function CorbeillePage() {
  const [trashedQuizzes, setTrashedQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrashedQuizzes();
  }, []);

  const fetchTrashedQuizzes = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // On récupère les quiz de l'utilisateur qui SONT dans la corbeille (is_trashed = true)
    let query = supabase.from('quizzes').select('*').eq('is_trashed', true).order('created_at', { ascending: false });
    
    // Si l'utilisateur est connecté, on ne filtre que ses quiz (si tu gères le user_id)
    if (user) {
       // query = query.eq('user_id', user.id); // Décommente si tu as une colonne user_id
    }

    const { data, error } = await query;
    if (!error && data) {
      setTrashedQuizzes(data);
    }
    setLoading(false);
  };

  // Restaurer (remettre is_trashed à false)
  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase.from('quizzes').update({ is_trashed: false }).eq('id', id);
      if (error) throw error;
      // Met à jour l'affichage en retirant le quiz restauré
      setTrashedQuizzes(trashedQuizzes.filter(q => q.id !== id));
    } catch (error) {
      console.error("Erreur lors de la restauration :", error);
    }
  };

  // Suppression définitive (Hard Delete)
  const handleHardDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce quiz ? Cette action est irréversible.")) return;
    
    try {
      const { error } = await supabase.from('quizzes').delete().eq('id', id);
      if (error) throw error;
      setTrashedQuizzes(trashedQuizzes.filter(q => q.id !== id));
    } catch (error) {
      console.error("Erreur lors de la suppression définitive :", error);
    }
  };

  // Vider toute la corbeille
  const handleEmptyTrash = async () => {
    if (!window.confirm("Vider toute la corbeille ? Tous ces quiz seront perdus à jamais.")) return;
    try {
      const { error } = await supabase.from('quizzes').delete().eq('is_trashed', true);
      if (error) throw error;
      setTrashedQuizzes([]);
    } catch (error) {
      console.error("Erreur lors du vidage de la corbeille :", error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Trash2 className="text-red-500" size={32} />
            Corbeille
          </h1>
          <p className="text-gray-500">Les éléments de la corbeille peuvent être restaurés ou supprimés définitivement.</p>
        </div>
        {trashedQuizzes.length > 0 && (
          <button onClick={handleEmptyTrash} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg transition flex items-center gap-2 text-sm border border-red-200">
            <AlertTriangle size={16} /> Vider la corbeille
          </button>
        )}
      </header>

      {trashedQuizzes.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center">
          <Trash2 className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Votre corbeille est vide</h3>
          <p className="text-gray-500">Les quiz que vous supprimez apparaîtront ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trashedQuizzes.map(quiz => (
            <div key={quiz.id} className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm flex flex-col opacity-75 hover:opacity-100 transition">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{quiz.title || "Quiz sans titre"}</h3>
              <p className="text-xs text-gray-400 mb-6">Supprimé récemment</p>
              
              <div className="mt-auto flex gap-3">
                <button 
                  onClick={() => handleRestore(quiz.id)}
                  className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
                >
                  <RefreshCcw size={16} /> Restaurer
                </button>
                <button 
                  onClick={() => handleHardDelete(quiz.id)}
                  className="flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
