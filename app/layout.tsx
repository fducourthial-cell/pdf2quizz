// app/layout.tsx
import './globals.css';
import React from 'react';
import Link from 'next/link';
import { Plus, FileText, Clock, Trash2, Settings, User } from 'lucide-react';

export const metadata = {
  title: 'PDF2Quiz - Création IA',
  description: 'Générez des quiz automatiquement à partir de PDF',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                Q
              </div>
              <span className="text-xl font-bold tracking-tight">PDF2Quiz</span>
            </div>

            <Link href="/" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors mb-8">
              <Plus size={20} />
              Nouveau Quiz
            </Link>

            <nav className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bibliothèque</p>
                <ul className="space-y-1">
                  <li>
                    {/* Lien corrigé vers la page bibliothèque */}
                    <Link href="/bibliotheque" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700 hover:text-blue-600 transition-colors">
                      <FileText size={18} />
                      Mes Quiz
                    </Link>
                  </li>
                  <li>
                    <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700 transition-colors">
                      <Clock size={18} />
                      Récents
                    </Link>
                  </li>
                  <li>
                    <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700 transition-colors">
                      <Trash2 size={18} />
                      Corbeille
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>
          </div>

          <div className="p-6 border-t border-gray-100">
            <ul className="space-y-1 mb-4">
              <li>
                <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700 transition-colors">
                  <Settings size={18} />
                  Paramètres
                </Link>
              </li>
            </ul>
            <div className="flex items-center gap-3 px-3 py-2 mt-4 rounded-md bg-gray-50 border border-gray-200">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                <User size={16} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">Créateur</p>
                <p className="text-xs text-gray-500 truncate">Plan Pro</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ZONE CENTRALE (Le contenu de page.tsx ou bibliotheque/page.tsx s'injecte ici) */}
        <main className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
          {children}
        </main>

      </body>
    </html>
  );
}
