// app/api/generate-quiz/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    // 3. Configurer le modèle Gemini (Gemini 1.5 Flash est idéal pour la rapidité)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });

    // 4. Le Prompt Engineering (Crucial pour forcer le format JSON)
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

    // Exemple à ajouter dans ton route.ts avant le return final :
const { data: savedQuiz, error: dbError } = await supabase
  .from('quizzes')
  .insert([
    { 
      pdf_url: pdfUrl, 
      title: "Quiz généré par l'IA", 
      questions: quiz 
    }
  ])
  .select();

    // 6. Nettoyage et parsing du JSON (Gemini peut parfois rajouter des balises markdown)
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const quizData = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, quiz: quizData });

  } catch (error: any) {
    console.error('Erreur API Generate Quiz:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
