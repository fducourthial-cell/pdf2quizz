// app/profil/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { User, Mail, CreditCard, Activity, Trash2, AlertTriangle, Shield, Check } from 'lucide-react';

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  
  // États des infos utilisateur
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('Utilisateur PDF2Quiz');
  const [email, setEmail] = useState('utilisateur@email.com');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // État de la consommation
  const [quizCount, setQuizCount] = useState(0);
  const QUIZ_LIMIT = 1; // Passage à 1 pour le forfait gratuit

  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          setEmail(user.email || '');
          setDisplayName(user.user_metadata?.full_name || 'Utilisateur PDF2Quiz');

          // --- NOUVELLE MÉTHODE DE LECTURE DU QUOTA ---
          const currentMonth = new Date().toISOString().slice(0, 7); // ex: "2026-08"

          const { data: quotaData, error } = await supabase
            .from('user_quotas')
            .select('usage_count')
            .eq('user_id', user.id)
            .eq('period', currentMonth)
            .single();

          if (!error && quotaData) {
            setQuizCount(quotaData.usage_count);
          } else {
            setQuizCount(0); // Si aucune ligne, c'est qu'il n'a encore rien consommé
          }
        }
      } catch (err) {
        console.error("Erreur lors du chargement du profil :", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        email: email,
        data: { full_name: displayName }
      });

      if (error) throw error;
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erreur de sauvegarde :", err);
      alert("Erreur lors de la mise à jour du profil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmptyLibrary = async () => {
    if (!userId) return;
    if (!confirm("⚠️ Attention : Voulez-vous vraiment vider votre bibliothèque ?")) return;

    try {
      // On utilise désormais le Soft Delete pour vider la bibliothèque
      const { error } = await supabase
        .from('quizzes')
        .update({ is_trashed: true })
        .eq('user_id', userId); // Sécurité absolue : cible uniquement cet utilisateur
        
      if (error) throw error;
      
      // Note : On ne remet PAS le quizCount à 0 ici, car on utilise le système de quotas !
      alert("Votre bibliothèque a été vidée avec succès.");
    } catch (err) {
      console.error("Erreur lors du vidage de la bibliothèque :", err);
      alert("Erreur lors de la suppression des quiz.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    const confirmWord = prompt("Pour confirmer la suppression définitive de votre compte, tapez 'SUPPRIMER' :");
    if (confirmWord !== 'SUPPRIMER') return;

    try {
      // Suppression Hard Delete de toutes les données liées à l'utilisateur
      await supabase.from('quizzes').delete().eq('user_id', userId);
      await supabase.from('user_quotas').delete().eq('user_id', userId);
      
      await supabase.auth.signOut();
      alert("Votre compte et toutes vos données ont été supprimés.");
      window.location.href = '/';
    } catch (err) {
      console.error("Erreur lors de la suppression du compte :", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calcul du pourcentage pour la jauge
  const progressPercentage = Math.min((quizCount / QUIZ_LIMIT) * 100, 100);
  let progressColor = "bg-blue-600";
  if (progressPercentage >= 80) progressColor = "bg-orange-500";
  if (progressPercentage >= 100) progressColor = "bg-red-600";

  return (
    <div className="max-w-3xl mx-auto pb-16 pt-8 px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Profil</h1>
        <p className="text-gray-500">Gérez vos informations, votre abonnement et vos données.</p>
      </header>

      <div className="space-y-8">
        
        {/* BLOC 1 : Informations personnelles */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User size={20} /></div>
            <h2 className="text-xl font-semibold text-gray-800">Informations personnelles</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'affichage</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>
            <div className="pt-2 flex items-center gap-4">
              <button 
                type="submit" 
                disabled={isSaving}
                className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition flex items-center gap-2"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
              {saveSuccess && (
                <span className="text-green-600 text-sm flex items-center gap-1 font-medium animate-pulse">
                  <Check size={16} /> Sauvegardé
                </span>
              )}
            </div>
          </form>
        </section>

        {/* BLOC 2 : Abonnement & Consommation */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Activity size={20} /></div>
            <h2 className="text-xl font-semibold text-gray-800">Abonnement & Consommation</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Plan Actuel */}
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500 font-medium mb-1">Plan actuel</p>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-3xl font-bold text-gray-900">Gratuit</span>
                <span className="text-sm text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded">Actif</span>
              </div>
              <p className="text-xs text-gray-500 mb-5">Fonctionnalités de base incluses. Limité à {QUIZ_LIMIT} quiz par mois.</p>
              <button className="w-full px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium rounded-lg transition shadow-sm flex items-center justify-center gap-2">
                <CreditCard size={18} />
                Gérer mon abonnement
              </button>
            </div>

            {/* Jauge de conso */}
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500 font-medium">Générations ce mois-ci</p>
                <span className="text-sm font-bold text-gray-900">{quizCount} / {QUIZ_LIMIT}</span>
              </div>
              
              {/* Barre de progression */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
                <div className={`h-2.5 rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${progressPercentage}%` }}></div>
              </div>
              
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                {quizCount >= QUIZ_LIMIT 
                  ? "Vous avez atteint votre limite mensuelle. Passez au plan Premium pour continuer." 
                  : `Il vous reste ${QUIZ_LIMIT - quizCount} génération(s) avant le mois prochain.`}
              </p>
            </div>
          </div>
        </section>

        {/* BLOC 3 : Zone de danger */}
        <section className="bg-red-50 border border-red-100 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-red-200/50">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Shield size={20} /></div>
            <h2 className="text-xl font-semibold text-red-800">Gérer mon compte</h2>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-red-100">
              <div>
                <h3 className="font-semibold text-gray-900">Vider ma bibliothèque</h3>
                <p className="text-sm text-gray-500">Cache définitivement tous les quiz que vous avez générés.</p>
              </div>
              <button 
                onClick={handleEmptyLibrary}
                className="shrink-0 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-lg transition flex items-center gap-2"
              >
                <Trash2 size={16} /> Vider la bibliothèque
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-red-100">
              <div>
                <h3 className="font-semibold text-gray-900">Supprimer mon compte</h3>
                <p className="text-sm text-gray-500">Efface votre compte, votre profil et toutes vos données. Irréversible.</p>
              </div>
              <button 
                onClick={handleDeleteAccount}
                className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition flex items-center gap-2 shadow-sm"
              >
                <AlertTriangle size={16} /> Supprimer le compte
              </button>
            </div>
          </div>
        </section>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <Link href="/confidentialite" className="text-sm text-gray-500 hover:text-gray-800 transition">
            Consulter la Politique de confidentialité
          </Link>
        </div>
        
      </div>
    </div>
  );
}
