// app/corbeille/page.tsx
'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function CorbeillePage() {
  return (
    <div className="max-w-4xl mx-auto pb-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Corbeille</h1>
        <p className="text-gray-500">Les quiz supprimés apparaîtront ici.</p>
      </header>

      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
        <Trash2 size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-1">La corbeille est vide</h3>
        <p className="text-sm text-gray-500 mb-6">Aucun élément n'a été supprimé pour le moment.</p>
        <Link 
          href="/bibliotheque"
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition"
        >
          Retourner à mes quiz
        </Link>
      </div>
    </div>
  );
}
