// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// ⚠️ À REMPLACER : Tes identifiants de prix trouvés dans le tableau de bord Stripe (Catalogue > Produits)
const STRIPE_PRICES = {
  LIGHT: process.env.STRIPE_PRICE_LIGHT || 'price_1U7yQURMlczKAhAHUqaLaujc',       // 4.99€ / mois
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM || 'price_1U8gjyRMlczKAhAHgHcDi1Pc', // 49.99€ / mois
  ULTIMATE: process.env.STRIPE_PRICE_ULTIMATE || 'price_1U8gklRMlczKAhAHm48AgV7J', // 99.99€ / mois
  PACK_50: process.env.STRIPE_PRICE_PACK_50 || 'price_1U8glHRMlczKAhAHBP2abAqW'  // 10€ ponctuel
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error(`⚠️ Erreur de signature du Webhook : ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Si le paiement est réussi
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.client_reference_id;
    const customerId = session.customer as string;

    if (userId) {
      try {
        // 1. Récupérer les articles achetés via l'API Stripe
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;

        // 2. Traitement des ACHATS PONCTUELS (Pack 50 crédits)
        if (priceId === STRIPE_PRICES.PACK_50) {
          
          // Récupérer le solde actuel de crédits extra
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('extra_credits')
            .eq('user_id', userId)
            .single();
          
          const currentCredits = subData?.extra_credits || 0;

          // Ajouter 50 crédits
          await supabase
            .from('subscriptions')
            .upsert({
              user_id: userId,
              stripe_customer_id: customerId,
              extra_credits: currentCredits + 50
            }, { onConflict: 'user_id' });

          console.log(`✅ Utilisateur ${userId} a acheté le pack de 50 crédits (Nouveau solde : ${currentCredits + 50})`);

        } 
        // 3. Traitement des ABONNEMENTS (Light, Premium, Ultimate)
        else {
          let planType = 'free';
          if (priceId === STRIPE_PRICES.LIGHT) planType = 'light';
          if (priceId === STRIPE_PRICES.PREMIUM) planType = 'premium';
          if (priceId === STRIPE_PRICES.ULTIMATE) planType = 'ultimate';

          const { error } = await supabase
            .from('subscriptions')
            .upsert({
              user_id: userId,
              stripe_customer_id: customerId,
              is_premium: true, // On le garde à true pour désactiver la pub AdSense
              plan_type: planType
            }, { onConflict: 'user_id' });

          if (error) throw error;
          console.log(`✅ Utilisateur ${userId} abonné avec succès au forfait : ${planType}`);
        }
      } catch (error) {
        console.error("Erreur lors de la mise à jour dans Supabase :", error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
