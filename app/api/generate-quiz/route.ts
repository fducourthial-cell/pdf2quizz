// app/api/generate-quiz/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2 || '');

export async function POST(req: NextRequest) {
  try {
    const { pdfUrl, settings, userId, fileName } = await req.json(); // <-- On récupère fileName

    if (!pdfUrl) {
      return NextResponse.json({ error: 'URL du fichier manquante' }, { status: 400 });
    }

    // --- DÉTERMINATION DU TITRE PROPRE ---
    let fileTitle = 'Évaluation professionnelle';
    if (fileName) {
      // Si le front-end envoie le vrai nom du fichier d'origine
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
      fileTitle = nameWithoutExt.replace(/[-_]/g, " ").trim();
      fileTitle = fileTitle.charAt(0).toUpperCase() + fileTitle.slice(1);
    } else {
      // Fallback de secours si l'URL est utilisée
      try {
        const decodedUrl = decodeURIComponent(pdfUrl);
        const urlParts = decodedUrl.split('/');
        const rawFileName = urlParts[urlParts.length - 1].split('?')[0];
        if (rawFileName) {
          const nameWithoutExt = rawFileName.replace(/\.[^/.]+$/, "");
          fileTitle = nameWithoutExt.replace(/[-_]/g, " ").trim();
          fileTitle = fileTitle.charAt(0).toUpperCase() + fileTitle.slice(1);
        }
      } catch (e) {
        // Garde le titre par défaut si échec
      }
    }
    // --------------------------------------------------

    const fileResponse = await fetch(pdfUrl);
    if (!fileResponse.ok) throw new Error('Impossible de télécharger le fichier');
    
    const mimeType = fileResponse.headers.get('content-type') || 'application/pdf';
    const arrayBuffer = await fileResponse.arrayBuffer();
    
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);
    const base64Data = buffer.toString('base64');

    const filePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });

    const prompt = `
      Agis comme un concepteur pédagogique expert.
      Analyse le document ou l'image fourni(e) et crée un quiz de ${settings.questionCount} questions de type "${settings.type}" avec un niveau de difficulté "${settings.difficulty}".
      
      RÈGLE ABSOLUE : Tu dois renvoyer UNIQUEMENT un objet JSON valide, sans aucun texte avant ou après, sans balises Markdown (\`\`\`json).
      
      Le format JSON exact attendu est un tableau d'objets :
      [
        {
          "question": "Texte de la question",
          "options": ["Choix A", "Choix B", "Choix C", "Choix D"],
          "correctAnswer": "Choix B",
          "explanation": "Explication courte du pourquoi."
        }
      ]
    `;

    console.log(`Appel à Gemini en cours... (Type de fichier: ${mimeType})`);
    const result = await model.generateContent([prompt, filePart]);
    const responseText = result.response.text();

    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const quizData = JSON.parse(cleanedText);

    // 7. Enregistrement du quiz avec le titre basé sur le nom du fichier
    if (userId) {
      const { error: dbError } = await supabase
        .from('quizzes')
        .insert([
          { 
            user_id: userId, 
            pdf_url: pdfUrl, 
            title: fileTitle, // <-- Le nom du fichier est injecté ici automatiquement !
            questions: quizData 
          }
        ]);

      if (dbError) {
        console.error("Erreur d'enregistrement Supabase (quizzes) :", dbError.message);
      } else {
        console.log("✅ Quiz enregistré en base avec succès !");
        
       // --- MISE À JOUR DU QUOTA MENSUEL (VERSION ROBUSTE UPSERT) ---
        const currentMonth = new Date().toISOString().slice(0, 7); 

        // On utilise un RPC ou un upsert direct si la contrainte d'unicité est bien configurée,
        // ou une logique propre de recherche/insertion :
        const { data: existingQuota } = await supabase
          .from('user_quotas')
          .select('id, usage_count')
          .eq('user_id', userId)
          .eq('period', currentMonth)
          .maybeSingle(); // Utilise maybeSingle pour éviter les erreurs si la ligne n'existe pas

        if (existingQuota) {
          const { error: updateError } = await supabase
            .from('user_quotas')
            .update({ usage_count: existingQuota.usage_count + 1 })
            .eq('id', existingQuota.id);

          if (updateError) console.error("Erreur update quota :", updateError.message);
        } else {
          const { error: insertError } = await supabase
            .from('user_quotas')
            .insert([{ user_id: userId, period: currentMonth, usage_count: 1 }]);

          if (insertError) console.error("Erreur insert quota :", insertError.message);
        }
      }
    }

    return NextResponse.json({ success: true, quiz: quizData });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
    console.error('Erreur API Generate Quiz:', errorMessage);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
