// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    
    // --- 1. VÉRIFICATION ANTI-DOUBLON (IDEMPOTENCE) ---
    const { error: insertError } = await supabaseAdmin
      .from('stripe_events')
      .insert({ id: event.id });

    if (insertError) {
      if (insertError.code === '23505') {
        console.log(`Événement Stripe ${event.id} déjà traité. Ignoré.`);
        return NextResponse.json({ received: true });
      }
      console.error("Erreur lors de l'insertion dans stripe_events :", insertError);
      return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
    }
  } catch (err: any) {
    console.error(`🚨 ERREUR SIGNATURE WEBHOOK : ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // --- 2. GESTION DES NOUVEAUX PAIEMENTS ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const userId = session.client_reference_id;
    const customerId = session.customer as string;

    if (!userId) {
      console.error("🚨 ERREUR : Aucun client_reference_id (userId) trouvé.");
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;

      if (!priceId) throw new Error("Impossible de récupérer l'ID du prix acheté.");

      if (priceId === STRIPE_PRICES.PACK_50) {
        const { error } = await supabaseAdmin.rpc('add_extra_credits', {
          target_user_id: userId,
          customer_id: customerId,
          credits_to_add: 50
        });
        if (error) throw error;
        console.log(`✅ SUCCÈS : +50 crédits (RPC) pour ${userId}`);
      } else {
        let planType = 'free';
        if (priceId === STRIPE_PRICES.LIGHT) planType = 'light';
        else if (priceId === STRIPE_PRICES.PREMIUM) planType = 'premium';
        else if (priceId === STRIPE_PRICES.ULTIMATE) planType = 'ultimate';
        else throw new Error(`PriceId inconnu : ${priceId}`);

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
      console.error("🚨 ERREUR MISE À JOUR SUPABASE :", error.message);
      return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
    }
  }

  // --- 3. GESTION DES ANNULATIONS ET ÉCHECS DE PAIEMENT ---
  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'past_due') {
      try {
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            is_premium: false,
            plan_type: 'free'
          })
          .eq('stripe_customer_id', customerId);

        if (error) throw error;
        console.log(`❌ ABONNEMENT RÉVOQUÉ : Client Stripe ${customerId}`);
      } catch (error: any) {
        console.error("🚨 ERREUR RÉVOCATION :", error.message);
        return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
