// app/profil/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { User, Mail, CreditCard, Activity, Trash2, AlertTriangle, Shield, Check, Star, Zap, Package } from 'lucide-react';

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  
  // États des infos utilisateur
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('Utilisateur PDF2Quiz');
  const [email, setEmail] = useState('utilisateur@email.com');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- NOUVELLE GESTION DE L'ABONNEMENT ---
  const [planType, setPlanType] = useState('free');
  const [extraCredits, setExtraCredits] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);

  // Définition dynamique de la limite mensuelle
  let QUIZ_LIMIT = 1;
  if (planType === 'light') QUIZ_LIMIT = 20;
  if (planType === 'premium') QUIZ_LIMIT = 500;
  if (planType === 'ultimate') QUIZ_LIMIT = 1000;

  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          setEmail(user.email || '');
          setDisplayName(user.user_metadata?.full_name || 'Utilisateur PDF2Quiz');
          
          // 1. On récupère les détails précis de l'abonnement
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('plan_type, extra_credits')
            .eq('user_id', user.id)
            .single();

          if (subData) {
            setPlanType(subData.plan_type || 'free');
            setExtraCredits(subData.extra_credits || 0);
          }

          // 2. On récupère la consommation du mois en cours
          const currentMonth = new Date().toISOString().slice(0, 7);
          const { data: quotaData, error } = await supabase
            .from('user_quotas')
            .select('usage_count')
            .eq('user_id', user.id)
            .eq('period', currentMonth)
            .single();

          if (!error && quotaData) {
            setQuizCount(quotaData.usage_count);
          } else {
            setQuizCount(0);
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
      alert("Erreur lors de la mise à jour.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmptyLibrary = async () => {
    if (!userId || !confirm("⚠️ Voulez-vous vraiment vider votre bibliothèque ?")) return;
    try {
      const { error } = await supabase.from('quizzes').update({ is_trashed: true }).eq('user_id', userId);
      if (error) throw error;
      alert("Votre bibliothèque a été vidée.");
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    const confirmWord = prompt("Tapez 'SUPPRIMER' :");
    if (confirmWord !== 'SUPPRIMER') return;
    try {
      await supabase.from('quizzes').delete().eq('user_id', userId);
      await supabase.from('user_quotas').delete().eq('user_id', userId);
      await supabase.from('subscriptions').delete().eq('user_id', userId);
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error(err);
    }
  };

  // --- NOUVELLE FONCTION POUR LE PAIEMENT STRIPE ---
  const handleSubscribe = async (selectedPlanId: string) => {
    setIsProcessingStripe(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("Vous devez être connecté pour procéder au paiement.");
        setIsProcessingStripe(false);
        return;
      }

      // Envoi du plan choisi à notre API avec le bon format JSON
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ planId: selectedPlanId })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Erreur de paiement');

      // Redirection vers la page de paiement Stripe
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Erreur Stripe:", err);
      alert(err.message || "Impossible d'initialiser le paiement.");
      setIsProcessingStripe(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const progressPercentage = Math.min((quizCount / QUIZ_LIMIT) * 100, 100);
  let progressColor = "bg-blue-600";
  if (progressPercentage >= 80) progressColor = "bg-orange-500";
  if (progressPercentage >= 100) progressColor = "bg-red-600";

  // Formatter le nom du plan pour l'affichage
  const planNames: Record<string, string> = {
    free: 'Gratuit',
    light: 'Light',
    premium: 'Premium',
    ultimate: 'Ultime'
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 pt-8 px-4">
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

          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'affichage</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
            </div>
            <div className="pt-2 flex items-center gap-4">
              <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition flex items-center gap-2">
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

        {/* BLOC 2 : État actuel de l'abonnement */}
        <section className={`border rounded-2xl p-6 shadow-sm transition-colors ${planType !== 'free' ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className={`p-2 rounded-lg ${planType !== 'free' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
              <Activity size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Ma Consommation</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Actuel */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500 font-medium mb-1">Plan mensuel actuel</p>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-3xl font-bold text-gray-900 capitalize">
                  {planNames[planType] || planType}
                </span>
                <span className="text-sm text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded">Actif</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Vous avez droit à <strong className="text-gray-900">{QUIZ_LIMIT} quiz</strong> par mois.
              </p>
              
              {/* Crédits ponctuels */}
         
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
                    <Zap size={16} /> Crédits bonus restants
                  </div>
                  <span className="font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">{Number(extraCredits)}</span>
                </div>
            
            {/* Jauge de conso */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500 font-medium">Utilisés ce mois-ci</p>
                <span className="text-sm font-bold text-gray-900">{quizCount} / {QUIZ_LIMIT}</span>
              </div>
              
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2 overflow-hidden">
                <div className={`h-2.5 rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${progressPercentage}%` }}></div>
              </div>
              
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                {quizCount >= QUIZ_LIMIT 
                  ? "Limite mensuelle atteinte. Utilisez vos crédits bonus ou passez à un forfait supérieur."
                  : `Il vous reste ${QUIZ_LIMIT - quizCount} génération(s) avant la réinitialisation.`}
              </p>
            </div>
          </div>
        </section>

        {/* BLOC 3 : Les offres (Upsell) */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Star size={20} /></div>
            <h2 className="text-xl font-semibold text-gray-800">Évoluer & Acheter des crédits</h2>
          </div>

          {/* Grille des Forfaits Mensuels */}
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Abonnements Mensuels</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            
            {/* Forfait Light */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors flex flex-col">
              <h4 className="font-bold text-lg text-gray-900">Light</h4>
              <p className="text-2xl font-black text-blue-600 my-2">4,99€ <span className="text-sm text-gray-500 font-normal">/mois</span></p>
              <ul className="text-sm text-gray-600 space-y-2 mb-6 flex-grow">
                <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> 20 Quiz / mois</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> Zéro publicité</li>
              </ul>
              <button 
                onClick={() => handleSubscribe('light')} 
                disabled={isProcessingStripe || planType === 'light'}
                className="w-full py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
              >
                {planType === 'light' ? 'Plan Actuel' : 'Choisir Light'}
              </button>
            </div>

            {/* Forfait Premium */}
            <div className="border-2 border-indigo-500 bg-indigo-50/20 rounded-xl p-5 relative flex flex-col">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAIRE</div>
              <h4 className="font-bold text-lg text-gray-900">Premium</h4>
              <p className="text-2xl font-black text-indigo-600 my-2">49,99€ <span className="text-sm text-gray-500 font-normal">/mois</span></p>
              <ul className="text-sm text-gray-600 space-y-2 mb-6 flex-grow">
                <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> 500 Quiz / mois</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> Zéro publicité</li>
              </ul>
              <button 
                onClick={() => handleSubscribe('premium')} 
                disabled={isProcessingStripe || planType === 'premium'}
                className="w-full py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
              >
                {planType === 'premium' ? 'Plan Actuel' : 'Choisir Premium'}
              </button>
            </div>

            {/* Forfait Ultime */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-gray-800 transition-colors flex flex-col">
              <h4 className="font-bold text-lg text-gray-900">Ultime</h4>
              <p className="text-2xl font-black text-gray-900 my-2">99,99€ <span className="text-sm text-gray-500 font-normal">/mois</span></p>
              <ul className="text-sm text-gray-600 space-y-2 mb-6 flex-grow">
                <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> 1000 Quiz / mois</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> Zéro publicité</li>
              </ul>
              <button 
                onClick={() => handleSubscribe('ultimate')} 
                disabled={isProcessingStripe || planType === 'ultimate'}
                className="w-full py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
              >
                {planType === 'ultimate' ? 'Plan Actuel' : 'Choisir Ultime'}
              </button>
            </div>
          </div>

          {/* Achat Ponctuel (Crédits) */}
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Besoin ponctuel</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><Package size={24} /></div>
              <div>
                <h4 className="font-bold text-gray-900">Pack de 50 crédits bonus</h4>
                <p className="text-sm text-gray-600">Générez 50 quiz supplémentaires sans changer d'abonnement. Valable à vie.</p>
              </div>
            </div>
            <button 
              onClick={() => handleSubscribe('pack_50')} 
              disabled={isProcessingStripe}
              className="shrink-0 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50"
            >
              Acheter pour 10€
            </button>
          </div>
        </section>

        {/* BLOC 4 : Zone de danger */}
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
              <button onClick={handleEmptyLibrary} className="shrink-0 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-lg transition flex items-center gap-2">
                <Trash2 size={16} /> Vider la bibliothèque
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-red-100">
              <div>
                <h3 className="font-semibold text-gray-900">Supprimer mon compte</h3>
                <p className="text-sm text-gray-500">Efface votre compte, votre profil et toutes vos données. Irréversible.</p>
              </div>
              <button onClick={handleDeleteAccount} className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition flex items-center gap-2 shadow-sm">
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
