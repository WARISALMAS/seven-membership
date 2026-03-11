'use client';

import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Replace with your actual Test Publishable Key from Stripe Dashboard
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here');

// This MUST be the default export
export default function TestPaymentPage() {
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // Create a PaymentIntent as soon as the page loads
    fetch('/api/test-create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 2000 }), // $10.00
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret))
      .catch((err) => console.error("Error fetching clientSecret:", err));
  }, []);

  return (
    <div style={{ maxWidth: '500px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f4f4f5', borderRadius: '8px' }}>
        <h2 style={{ color: '#111827', margin: '0 0 10px 0' }}>🛠️ Payment Integration Test</h2>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
          <strong>Status:</strong> <span style={{ color: clientSecret ? '#10b981' : '#f59e0b' }}>
            {clientSecret ? 'Ready' : 'Loading Stripe...'}
          </span>
        </p>
      </div>

      {clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm />
        </Elements>
      )}
    </div>
  );
}

// Sub-component used inside the Elements provider
function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/test-payment` },
    });

    if (error) setMessage(error.message || "An error occurred");
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button 
        disabled={!stripe} 
        style={{ 
          marginTop: '20px', 
          width: '100%', 
          padding: '12px', 
          backgroundColor: '#0070f3', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Pay Now
      </button>
      {message && <p style={{ color: 'red', marginTop: '10px' }}>{message}</p>}
    </form>
  );
}
