// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // 1. Vérification de la clé secrète uniquement
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Configuration Stripe manquante sur le serveur (Clé secrète)." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    // 2. Authentification sécurisée via le jeton
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé (Token manquant)' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide ou expirée.' }, { status: 401 });
    }

    // 3. Récupérer le plan choisi envoyé par le front-end
    const body = await req.json();
    const selectedPlan = body.planId || 'premium'; // 'premium' par défaut si rien n'est envoyé

    // 4. Assigner le bon Price ID et le bon mode d'achat
    let stripePriceId = '';
    let mode: 'payment' | 'subscription' = 'subscription';

    if (selectedPlan === 'light') {
      stripePriceId = process.env.STRIPE_PRICE_LIGHT || '';
    } else if (selectedPlan === 'premium') {
      stripePriceId = process.env.STRIPE_PRICE_PREMIUM || '';
    } else if (selectedPlan === 'ultimate') {
      stripePriceId = process.env.STRIPE_PRICE_ULTIMATE || '';
    } else if (selectedPlan === 'pack_50') {
      stripePriceId = process.env.STRIPE_PRICE_PACK_50 || '';
      mode = 'payment'; // Attention : le pack est un achat unique, pas un abonnement !
    }

    if (!stripePriceId) {
      return NextResponse.json(
        { error: `ID de prix manquant pour le forfait : ${selectedPlan}. Vérifiez vos variables Vercel.` },
        { status: 500 }
      );
    }

    const origin = req.headers.get('origin') || 'https://pdf2quizz.vercel.app';

    // 5. Création de la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: `${origin}/profil?success=true`,
      cancel_url: `${origin}/profil?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.id, // Très important pour que le Webhook retrouve l'utilisateur
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
