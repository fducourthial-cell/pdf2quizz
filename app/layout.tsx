// app/layout.tsx
import './globals.css';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AuthSidebar from '@/components/AuthSidebar';
import { Plus, FileText, Clock, Trash2, Settings, User, Award } from 'lucide-react';

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
    <div className="flex items-center justify-center gap-2 mb-8">
      
      {/* NOUVEAU LOGO */}
      <Image 
        src="/ban.png" 
        alt="Logo PDF2Quiz" 
        width={160} 
        height={80} 
        className="rounded-lg"
      />
      
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
                    <Link href="/bibliotheque" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700 hover:text-blue-600 transition-colors">
                      <FileText size={18} />
                      Mes Quiz
                    </Link>
                  </li>
                  <li>
                    <Link href="/certificats" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700 hover:text-blue-600 transition-colors">
                      <Award size={18} />
                      Mes Certifications
                    </Link>
                  </li>
                  <li>
                    <Link href="/corbeille" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700 hover:text-blue-600 transition-colors">
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
                <Link href="/profil" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700 transition-colors">
                  <Settings size={18} />
                  Paramètres
                </Link>
              </li>
            </ul>
            
            {/* LE NOUVEAU COMPOSANT DE CONNEXION DYNAMIQUE */}
            <AuthSidebar />
            
          </div>
        </aside>

        {/* ZONE CENTRALE */}
        <main className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
          {children}
        </main>

      </body>
    </html>
  );
}
