// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// 1. Initialisation avec la clé ADMIN (Passe-partout)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // <-- Clé secrète vitale !
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const STRIPE_PRICES = {
  LIGHT: process.env.STRIPE_PRICE_LIGHT,
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM,
  ULTIMATE: process.env.STRIPE_PRICE_ULTIMATE,
  PACK_50: process.env.STRIPE_PRICE_PACK_50
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error(`🚨 ERREUR SIGNATURE WEBHOOK : ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Identifiant crucial qu'on a passé depuis la page checkout !
    const userId = session.client_reference_id;
    const customerId = session.customer as string;

    if (!userId) {
      console.error("🚨 ERREUR : Aucun client_reference_id (userId) trouvé dans la session Stripe.");
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    try {
      console.log(`Traitement de la session pour l'utilisateur : ${userId}`);
      
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;

      if (!priceId) {
        throw new Error("Impossible de récupérer l'ID du prix acheté.");
      }

      if (priceId === STRIPE_PRICES.PACK_50) {
        // --- LOGIQUE PACK 50 ---
        const { data: subData } = await supabaseAdmin
          .from('subscriptions')
          .select('extra_credits')
          .eq('user_id', userId)
          .single();
        
        const currentCredits = subData?.extra_credits || 0;
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            extra_credits: currentCredits + 50
          }, { onConflict: 'user_id' });
        
        if (error) throw error;
        console.log(`✅ SUCCÈS : +50 crédits ajoutés pour ${userId}`);

      } else {
        // --- LOGIQUE FORFAITS MENSUELS ---
        let planType = 'free';
        if (priceId === STRIPE_PRICES.LIGHT) planType = 'light';
        else if (priceId === STRIPE_PRICES.PREMIUM) planType = 'premium';
        else if (priceId === STRIPE_PRICES.ULTIMATE) planType = 'ultimate';
        else {
          throw new Error(`Le priceId reçu (${priceId}) ne correspond à aucun forfait connu.`);
        }

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            is_premium: true,
            plan_type: planType
          }, { onConflict: 'user_id' });

        if (error) throw error;
        console.log(`✅ SUCCÈS : Forfait ${planType} activé pour ${userId}`);
      }

    } catch (error: any) {
      console.error("🚨 ERREUR FATALE LORS DE LA MISE À JOUR SUPABASE :", error.message || error);
      // On retourne une erreur 500 pour que Stripe sache que ça a échoué et réessaie plus tard
      return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
