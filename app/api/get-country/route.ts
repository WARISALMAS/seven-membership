import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Get client IP from headers (if behind a proxy like Vercel)
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("host") || "8.8.8.8";

    // Call ipapi.co with IP
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!res.ok) throw new Error("Failed to fetch country");

    const data = await res.json();

    // Return lowercase country code
    return NextResponse.json({ country: data.country_code?.toLowerCase() || "us" });
  } catch (err) {
    console.error("Error detecting country:", err);
    return NextResponse.json({ country: "us" }); // fallback
  }
}