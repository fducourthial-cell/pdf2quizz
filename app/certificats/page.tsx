// app/certificats/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Award, Download, Calendar, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Link from 'next/link';

export default function CertificatsPage() {
  const [passedQuizzes, setPassedQuizzes] = useState<any[]>([]);
  const [userName, setUserName] = useState<string>('Apprenant');
  const [loading, setLoading] = useState(true);
  
  // États pour la génération du PDF
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [quizToDownload, setQuizToDownload] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Récupérer l'utilisateur
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Apprenant');
        }

        // 2. Récupérer UNIQUEMENT les quiz réussis (passed = true) non supprimés
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('passed', true)
          .or('is_trashed.is.null,is_trashed.eq.false')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setPassedQuizzes(data);
      } catch (err) {
        console.error("Erreur lors du chargement :", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const downloadCertificate = async (quiz: any) => {
    setDownloadingId(quiz.id);
    setQuizToDownload(quiz);

    setTimeout(async () => {
      const certificateElement = document.getElementById('certificate-template');
      if (!certificateElement) {
        setDownloadingId(null);
        return;
      }

      try {
        const canvas = await html2canvas(certificateElement, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Certificat_${quiz.title || 'PDF2Quiz'}.pdf`);
      } catch (error) {
        console.error("Erreur PDF :", error);
        alert("Erreur lors de la création du certificat.");
      } finally {
        setDownloadingId(null);
      }
    }, 100);
  };

 // --- EXPORT CSV ÉPURÉ POUR PROFESSIONNELS ---
  const handleExportCSV = () => {
    if (passedQuizzes.length === 0) return;

    // 1. Définition des 4 colonnes souhaitées
    const headers = [
      "Nom du candidat",
      "Nom du test",
      "Résultat obtenu",
      "Date"
    ];

    // 2. Formatage des données
    const rows = passedQuizzes.map((quiz) => {
      const formattedDate = new Date(quiz.created_at).toLocaleDateString('fr-FR');
      const totalQuestions = quiz.questions?.length || 0;
      const score = quiz.score !== undefined ? quiz.score : totalQuestions;
      const scorePercent = totalQuestions > 0 ? `${Math.round((score / totalQuestions) * 100)}%` : "100%";
      const resultText = `${score}/${totalQuestions} (${scorePercent})`;
      const cleanTitle = (quiz.title || "Quiz sans titre").replace(/"/g, '""');

      return [
        `"${userName}"`,
        `"${cleanTitle}"`,
        `"${resultText}"`,
        `"${formattedDate}"`
      ].join(';');
    });

    // 3. Directive "sep=;" + BOM UTF-8 pour forcer la séparation des colonnes dans Excel
    const csvContent = '\uFEFFsep=;\n' + [headers.join(';'), ...rows].join('\n');

    // Conversion des caractères spéciaux en binaire Windows-1252 / ISO-8859-1
    const buffer = new Uint8Array(csvString.length);
    for (let i = 0; i < csvString.length; i++) {
      buffer[i] = csvString.charCodeAt(i) & 0xff;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `certifications_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl w-full px-4 sm:px-6 md:px-8 mx-auto pb-16 pt-8 min-h-screen flex flex-col">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Award className="text-yellow-500" size={32} />
            Mes Certifications
          </h1>
          <p className="text-gray-500">Retrouvez et téléchargez les certificats de vos quiz réussis.</p>
        </div>

        {passedQuizzes.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition shrink-0"
          >
            <FileSpreadsheet size={18} />
            Exporter en CSV
          </button>
        )}
      </header>

      {passedQuizzes.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center">
          <Award className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune certification pour le moment</h3>
          <p className="text-gray-500 mb-6">Obtenez au moins 80% de bonnes réponses à un quiz pour débloquer votre premier certificat !</p>
          <Link href="/" className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition">
            Générer un quiz
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {passedQuizzes.map(quiz => {
            const date = new Date(quiz.created_at).toLocaleDateString('fr-FR');
            const isDownloading = downloadingId === quiz.id;
            const scorePercent = Math.round(((quiz.score ?? quiz.questions?.length ?? 1) / (quiz.questions?.length || 1)) * 100);

            return (
              <div key={quiz.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                      <Award size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 line-clamp-2" title={quiz.title}>
                        {quiz.title || "Quiz sans titre"}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar size={14} /> Obtenu le {date}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg">{scorePercent}%</span>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => downloadCertificate(quiz)}
                    disabled={isDownloading}
                    className="w-full py-2.5 px-4 bg-gray-50 hover:bg-blue-50 text-blue-700 text-sm font-semibold rounded-xl border border-gray-200 hover:border-blue-200 transition flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    {isDownloading ? "Génération du PDF..." : "Télécharger le certificat"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TEMPLATE CACHÉ DYNAMIQUE */}
      {quizToDownload && (
        <div className="absolute left-[-9999px] top-[-9999px]">
          <div 
            id="certificate-template" 
            className="w-[1123px] h-[794px] bg-white relative flex flex-col items-center justify-center font-sans text-gray-900"
            style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")', border: '24px solid #2563eb' }}
          >
            <div className="absolute inset-8 border-4 border-blue-600/30 rounded-2xl pointer-events-none"></div>

            <div className="flex flex-col items-center justify-center w-full mt-[-60px] px-24 text-center">
              <div className="mb-6">
                <svg className="w-28 h-28 text-green-500 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l5.59-5.59L18 10l-7 7z"/>
                </svg>
              </div>

              <h1 className="text-6xl font-black text-blue-900 mb-3 tracking-tight uppercase">Certificat de Réussite</h1>
              <p className="text-xl text-gray-600 mb-10">Ce document certifie formellement que</p>
              
              <h2 className="text-5xl font-bold text-gray-900 mb-10 pb-4 border-b-2 border-gray-300 px-16 inline-block">
                {userName}
              </h2>

              <p className="text-xl text-gray-600 mb-4">A complété avec succès l'évaluation :</p>
              <h3 className="text-4xl font-bold text-blue-700 max-w-4xl leading-tight">
                « {quizToDownload.title || 'Évaluation PDF2Quiz'} »
              </h3>
            </div>

            <div className="absolute bottom-20 left-24 right-24 flex justify-between items-end">
              <div className="flex items-center gap-12">
                <div className="text-left">
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Score Obtenu</p>
                  <p className="text-4xl font-black text-green-600">
                    {Math.round(((quizToDownload.score ?? quizToDownload.questions?.length ?? 1) / (quizToDownload.questions?.length || 1)) * 100)}%
                  </p>
                </div>
                <div className="w-px h-12 bg-gray-300"></div>
                <div className="text-left">
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Date d'obtention</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {new Date(quizToDownload.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-400 mb-1">Généré et certifié par</p>
                <p className="text-3xl font-black text-blue-600 tracking-tight">PDF2Quiz AI</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
