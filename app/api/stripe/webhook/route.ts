// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.client_reference_id;
    const customerId = session.customer as string;

    if (userId) {
      const { error } = await supabase
        .from('subscriptions')
        .upsert([
          {
            user_id: userId,
            stripe_customer_id: customerId,
            is_premium: true,
          },
        ], { onConflict: 'user_id' });

      if (error) {
        console.error("Erreur lors de la mise à jour du statut premium dans Supabase :", error);
      } else {
        console.log(`✅ Utilisateur ${userId} passé en Premium avec succès !`);
      }
    }
  }

  return NextResponse.json({ received: true });
}
