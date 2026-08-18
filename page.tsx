import React from 'react';

export default function NewQuizPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* En-tête de la page */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Créer un nouveau quiz</h1>
        <p className="text-gray-500">Importez un document PDF et laissez l'IA générer vos questions.</p>
      </header>

      {/* 
        Le composant Dropzone (Phase 2) viendra se placer juste ici, 
        englobé dans une belle carte (Card) blanche avec une légère ombre.
      */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <p className="text-center text-gray-400 italic">Emplacement du futur composant Dropzone...</p>
      </div>

    </div>
  );
}
