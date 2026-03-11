import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
type LocationKey = 'Gray Dubai' | 'Ibiza' | 'Dubai'

const STRIPE_SECRET_KEY_DUBAI = process.env.STRIPE_SECRET_KEY_DUBAI
const STRIPE_SECRET_KEY_IBIZA = process.env.STRIPE_SECRET_KEY_IBIZA
const STRIPE_SECRET_KEY_GRAY = process.env.STRIPE_SECRET_KEY_GRAY

function getStripeSecretKeyForLocation(location: LocationKey): string | null {
  switch (location) {
    case 'Dubai':
      return STRIPE_SECRET_KEY_DUBAI ?? null
    case 'Ibiza':
      return STRIPE_SECRET_KEY_IBIZA ?? null
    case 'Gray Dubai':
      return STRIPE_SECRET_KEY_GRAY ?? null
    default:
      return null
  }
}


interface DirectCardBody {
  location: LocationKey
  amount: number
  currency: string
  description?: string
  paymentMethodId: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  zip?: string
  zohoLocationId?: string
  planId?: string
  planDuration?: string
  couponId?: string
  couponDiscount?: string | number
  existingMemberId?: string
}
export async function POST(req: NextRequest) {
  try {
    //const { amount } = await req.json();
    const body = (await req.json()) as Partial<DirectCardBody>

    const {
      location,
      amount,
      currency,
      description = 'Subscription payment',
     // paymentMethodId,
      firstName = '',
      lastName = '',
      email = '',
      phone = '',
      zohoLocationId,
      planId,
      planDuration = 'Annual',
      couponId,
      couponDiscount,
      existingMemberId,
    } = body



    if (!location || !amount || !currency) {
      return NextResponse.json(
        { error: 'location, amount, currency are required' },
        { status: 400 },
      )
    }

        const secretKey = getStripeSecretKeyForLocation(location)
    
        if (!secretKey) {
          return NextResponse.json(
            {
              error: `Stripe secret key is not configured for location "${location}".`,
            },
            { status: 500 },
          )
        }

        
    const stripe = new Stripe(secretKey, {
      apiVersion: '2026-02-25.clover',
    })

        // 1. Create a Stripe customer
    const customer = await stripe.customers.create({
      name: `${firstName} ${lastName}`,
      email,
      phone,
      metadata: { couponId: couponId || "none" },
    });


    const amountInCents = Math.round(amount * 100)
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents, // In cents (e.g., 1000 = $10.00)
      currency: currency.toLowerCase(),
      customer: customer.id,
      description,
        metadata: {
        flow: 'membership_public_direct_test_pm',
        location,
        planId: planId ?? '',
        planDuration: planDuration ?? '',
        firstName,
        lastName,
        email,
        phone,
        // existingMemberId,
        zohoLocationId: zohoLocationId ?? '',
        couponId: couponId ?? '',
        couponDiscount:
          couponDiscount !== undefined && couponDiscount !== null
            ? String(couponDiscount)
            : '',
      },

      // This automatically enables Google Pay, Apple Pay, and Cards
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error('Stripe Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
