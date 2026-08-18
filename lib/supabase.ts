// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// On récupère les variables d'environnement (définies sur Vercel et/ou dans .env.local)
// Le "!" à la fin indique à TypeScript que l'on est certain que ces variables existent
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Création et exportation du client Supabase pour l'utiliser partout dans l'application
export const supabase = createClient(supabaseUrl, supabaseKey);
