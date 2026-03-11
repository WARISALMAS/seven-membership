"use client"; // <- This is required for useState/useEffect

import { useEffect, useState } from "react";

export default function LandingPage() {
  const [paymentStatus, setPaymentStatus] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") setPaymentStatus("success");
    else if (payment === "failed") setPaymentStatus("failed");
  }, []);

  if (true) {
    return (
      <div style={{ padding: 20, maxWidth: 400, margin: "auto", textAlign: "center" }}>
        <h2>🎉 Payment Successful!</h2>
        <p>Your membership has been created. Thank you for joining SEVEN!</p>
        <button onClick={() => window.location.replace("/")}>Go to Home</button>
      </div>
    );
  }

  if (paymentStatus === "failed") {
    return (
      <div style={{ padding: 20, maxWidth: 400, margin: "auto", textAlign: "center", color: "red" }}>
        <h2>⚠️ Payment Failed</h2>
        <p>Something went wrong with your payment. Please try again.</p>
        <button onClick={() => window.location.replace("/")}>Try Again</button>
      </div>
    );
  }

  return <div>Loading...</div>;
}