// app/api/generate-quiz/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase'; // Indispensable pour enregistrer en base

// INDISPENSABLE : Allonge la durée maximale d'exécution sur Vercel pour éviter les timeouts
export const maxDuration = 60; 

// Initialisation du client Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2 || '');

export async function POST(req: Request) {
  try {
    // 1. Récupérer les données envoyées par le frontend
    const { pdfUrl, settings } = await req.json();

    if (!pdfUrl) {
      return NextResponse.json({ error: 'URL du PDF manquante' }, { status: 400 });
    }

    // 2. Télécharger le PDF depuis l'URL publique Supabase
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) throw new Error('Impossible de télécharger le PDF');
    
    // Convertir le PDF en un format lisible par Gemini (Base64)
    const arrayBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    const pdfPart = {
      inlineData: {
        data: base64Data,
        mimeType: 'application/pdf',
      },
    };

    // 3. Configurer le modèle Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });

    // 4. Le Prompt Engineering
    const prompt = `
      Agis comme un concepteur pédagogique expert.
      Analyse le document PDF fourni et crée un quiz de ${settings.questionCount} questions de type "${settings.type}" avec un niveau de difficulté "${settings.difficulty}".
      
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

    // 5. Appel à l'API Gemini
    console.log("Appel à Gemini en cours...");
    const result = await model.generateContent([prompt, pdfPart]);
    const responseText = result.response.text();

    // 6. Nettoyage et parsing du JSON
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const quizData = JSON.parse(cleanedText);

    // 7. Enregistrement dans la base de données Supabase
    const { error: dbError } = await supabase
      .from('quizzes')
      .insert([
        { 
          pdf_url: pdfUrl, 
          title: `Quiz (${settings.type.toUpperCase()})`, 
          questions: quizData 
        }
      ]);

    if (dbError) {
      console.error("Erreur d'enregistrement Supabase :", dbError.message);
      // On continue quand même pour renvoyer le quiz au front si besoin
    } else {
      console.log("✅ Quiz enregistré en base de données avec succès !");
    }

    return NextResponse.json({ success: true, quiz: quizData });

  } catch (error: any) {
    console.error('Erreur API Generate Quiz:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
