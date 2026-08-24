// app/api/generate-quiz/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2 || '');

export async function POST(req: Request) {
  try {
    // 1. MODIFICATION ICI : On récupère aussi le userId envoyé par le frontend
    const { pdfUrl, settings, userId } = await req.json();

    if (!pdfUrl) {
      return NextResponse.json({ error: 'URL du fichier manquante' }, { status: 400 });
    }

    const fileResponse = await fetch(pdfUrl);
    if (!fileResponse.ok) throw new Error('Impossible de télécharger le fichier');
    
    const mimeType = fileResponse.headers.get('content-type') || 'application/pdf';
    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
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

    // 7. MODIFICATION ICI : On ajoute le user_id dans l'enregistrement
    const { error: dbError } = await supabase
      .from('quizzes')
      .insert([
        { 
          user_id: userId, // <-- Ajout vital pour lier le quiz à l'utilisateur
          pdf_url: pdfUrl, 
          title: `Quiz (${settings.type.toUpperCase()})`, 
          questions: quizData 
        }
      ]);

    if (dbError) {
      console.error("Erreur d'enregistrement Supabase :", dbError.message);
    } else {
      console.log("✅ Quiz enregistré en base avec succès !");
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
