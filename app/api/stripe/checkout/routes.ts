// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// On initialise Stripe avec la clé secrète configurée dans Vercel
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20', // Utilise la version récente
});

export async function POST(req: NextRequest) {
  try {
    // 1. On vérifie qui est l'utilisateur connecté via Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // 2. On récupère l'URL du site (pour que Stripe sache où renvoyer le client après le paiement)
    // En production, Vercel fournit l'URL. En test local, c'est localhost.
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://ton-site.vercel.app';

    // 3. On crée la session de paiement Stripe (Checkout Session)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID, // L'ID de ton abonnement à 4,99€
          quantity: 1,
        },
      ],
      mode: 'subscription', // Mode abonnement
      success_url: `${origin}/profil?success=true`, // Où aller si le paiement réussit
      cancel_url: `${origin}/profil?canceled=true`, // Où aller si le client annule
      customer_email: user.email, // Pré-remplit l'email du client sur la page de paiement
      // TRÈS IMPORTANT : On passe l'ID Supabase à Stripe pour s'en souvenir plus tard
      client_reference_id: user.id, 
    });

    // 4. On renvoie l'URL de la page de paiement générée par Stripe
    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Erreur Stripe Checkout:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement' },
      { status: 500 }
    );
  }
}
