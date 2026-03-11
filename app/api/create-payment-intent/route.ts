import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe =
  stripeSecretKey && stripeSecretKey.startsWith('sk_')
    ? new Stripe(stripeSecretKey)
    : null;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to enable Apple Pay and Google Pay.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { amount, currency, metadata } = body as {
      amount: number;
      currency: string;
      metadata?: Record<string, string>;
    };

    if (typeof amount !== 'number' || amount < 1 || !currency) {
      return NextResponse.json(
        { error: 'Invalid request. amount (in smallest unit, e.g. cents) and currency are required.' },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
       //payment_method_types: ['card', 'google_pay', 'apple_pay'], 
      metadata: metadata ?? {},
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create payment intent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
