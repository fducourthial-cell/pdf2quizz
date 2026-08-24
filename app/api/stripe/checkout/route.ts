// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
      return NextResponse.json(
        { error: "Configuration Stripe manquante sur le serveur." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    // On récupère le jeton envoyé par le bouton
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé (Token manquant)' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // On demande à Supabase d'identifier l'utilisateur grâce à ce jeton
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide ou expirée.' }, { status: 401 });
    }

    const origin = req.headers.get('origin') || 'https://pdf2quiz.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/profil?success=true`,
      cancel_url: `${origin}/profil?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.id,
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Erreur Stripe Checkout API:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}
