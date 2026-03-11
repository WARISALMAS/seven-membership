"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentRequestButtonElement } from "@stripe/react-stripe-js";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Location } from "@/lib/api/types";
import { useLocations } from "@/lib/api/locations";
import { useSubscriptionPlans } from "@/lib/api/subscription-plans";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Currency } from "lucide-react";
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

type Step = 1 | 2 | 3 |4;

type Brand = "Seven" | "Gray" | "";

type Club = Location & { brand: Brand };

interface Plan {
  id: string;
  brand: Brand;
  name: string;
  price: string;
  description: string;
  amount: number;
  currency: string;
  duration?: "Annual" | "Pass";
  tax_percentage?: number; // ✅ add this
  number_of_days?: number; // ✅ add this
}

type Gender = "male" | "female" | null;

// Per-location publishable keys (must be set in Vercel with NEXT_PUBLIC_ prefix)
const STRIPE_PK_DUBAI =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_DUBAI ?? "";
const STRIPE_PK_IBIZA =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_IBIZA ?? "";
const STRIPE_PK_GRAY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_GRAY ?? "";

// Resolve publishable key purely based on club name
function getStripePublishableKeyForClub(club?: Club | null): string {

  if (!club) {
    return "";
  }

  const rawName = club.name ?? "";
  const name = rawName.toLowerCase().trim();

  let key = "";
  let bucket: "dubai" | "ibiza" | "gray" | "unknown" = "unknown";
  if (name=="gray dubai") {
    key = STRIPE_PK_GRAY;
    bucket = "gray";
  } else if (name =="ibiza") {
    key = STRIPE_PK_IBIZA;
    bucket = "ibiza";
  }  else if (name =="dubai") {
    key = STRIPE_PK_DUBAI;
    bucket = "dubai";
  }
  return key;
}

export default function MembershipPage() {
  const [step, setStep] = useState<Step>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("waris@seven.family");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [brandFilter, setBrandFilter] = useState<Brand>("Seven");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isClubSheetOpen, setIsClubSheetOpen] = useState(false);
  const [gender, setGender] = useState<Gender>(null);
  // const [zohoContactId, setZohoContactId] = useState<string | null>(null);
  const [zohoContactId, setZohoContactId] = useState<string | null>("5501504000737154095");



  const emailIsValid = /\S+@\S+\.\S+/.test(email.trim());
  const phoneIsValid = phone.trim().length >= 7;

  const isStep1Valid =
    !!firstName.trim() &&
    !!lastName.trim() &&
    gender !== null &&
    emailIsValid &&
    phoneIsValid &&
    !!selectedClub;

  const isStep2Valid = !!selectedPlan;

  const resetFlow = () => {
    // Reset entire membership flow back to initial state
    setStep(1);
    setFirstName("");
    setLastName("");
    setEmail("");
    setZip("");
    setPhone("");
    setGender(null);
    setBrandFilter("");
    setSelectedClub(null);
    setSelectedPlan(null);
    setIsClubSheetOpen(false);
    setZohoContactId(null);
  };

  return (
    <main className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left: marketing panel */}
    <section className="relative hidden lg:block lg:w-1/2 bg-black text-white">
    {/* Background */}
    <div className="absolute inset-0">
      <img
        src="/images/seven1.webp"
        alt="Fitness training"
        className="w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-br from-black via-black/70 to-black/40" />
    </div>

    {/* Content */}
    <div className="relative h-full px-12 py-16 flex flex-col justify-center max-w-xl">
      <p className="text-xs tracking-[0.25em] uppercase mb-4 opacity-80">
        Welcome to
      </p>

      <h1 className="text-4xl leading-tight font-semibold mb-6">
      SEVEN
        <br />
        {/* UNLOCK $500 IN VALUE */}
      </h1>

      <p className="mb-4 text-sm">
       Where wellness meets exclusivity. Experience a high-end wellness club that seamlessly blends luxury with athletic performance, creating an environment designed to help you achieve your goals without compromise.
      </p>

    

      {/* <ul className="space-y-1 text-sm mb-8">
        <li>• 1 Equifit-style assessment</li>
        <li>• 2 personal training or 2 Pilates sessions</li>
        <li>• $200 credit towards retail or spa</li>
      </ul> */}

      <button
        type="button"
        className="text-xs underline underline-offset-4 text-white/80 hover:text-white w-fit"
      >
        {/* Terms &amp; Conditions */}
      </button>
    </div>
  </section>

      {/* Right: steps & forms */}
      <section className="flex-1 w-full min-w-0 flex flex-col px-3 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-14">
        {/* Step indicator */}
        <div className="flex flex-wrap gap-3 sm:gap-6 lg:gap-8 text-xs font-medium tracking-[0.2em] sm:tracking-[0.25em] uppercase mb-6 sm:mb-10">
          <StepPill index={1} label="Select Club" active={step === 1} />
          <StepPill index={2} label="Choose Membership" active={step === 2} />
          <StepPill index={3} label="Review and Pay" active={step === 3} />
        </div>

        {step === 1 && (
          <Step1SelectClub
            firstName={firstName}
            lastName={lastName}
            email={email}
            phone={phone}
            gender={gender}
            selectedClub={selectedClub}
            brandFilter={brandFilter}
            onChangeFirstName={setFirstName}
            onChangeLastName={setLastName}
            onChangeEmail={setEmail}
            onChangePhone={setPhone}
            onChangeGender={setGender}
            isValid={!!isStep1Valid}
            onNext={() => setStep(2)}
            onBrandFilterChange={setBrandFilter}
            isClubSheetOpen={isClubSheetOpen}
            onClubSheetOpenChange={setIsClubSheetOpen}
            onSelectClub={(club) => {
              setSelectedClub(club);
            }}
            zohoContactId={zohoContactId}
            onContactCreated={setZohoContactId}
          />
        )}

        {step === 2 && (
          <Step2ChooseMembership
            selectedClub={selectedClub}
            selectedPlan={selectedPlan}
            gender={gender}
            onSelectPlan={setSelectedPlan}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            isValid={isStep2Valid}
          />
        )}

        {step === 3 && selectedClub && selectedPlan && (
       
            <Step3ReviewPay
              firstName={firstName}
              lastName={lastName}
              email={email}
              phone={phone}
              club={selectedClub}
              plan={selectedPlan}
              memberId={zohoContactId}
              onBack={() => setStep(2)}
              onRestart={resetFlow}
              
            />
      
        )}

      </section>
    </main>
  );
}

function StepPill({
  index,
  label,
  active,
}: Readonly<{
  index: number;
  label: string;
  active: boolean;
}>) {
  return (
    <div className="flex flex-col gap-0.5 sm:gap-1">
      <span
        className={`text-[10px] sm:text-[10px] ${active ? "text-foreground" : "text-muted-foreground"}`}
      >
        {index.toString().padStart(2, "0")}
      </span>
      <span
        className={`text-[10px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.25em] ${
          active ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label.toUpperCase()}
      </span>
    </div>
  );
}

function Step1SelectClub(
  props: Readonly<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    gender: Gender;
    selectedClub: Club | null;
    brandFilter: Brand;
    isValid: boolean;
    isClubSheetOpen: boolean;
    onChangeFirstName: (v: string) => void;
    onChangeLastName: (v: string) => void;
    onChangeEmail: (v: string) => void;
    onChangePhone: (v: string) => void;
    onChangeGender: (v: Gender) => void;
    onNext: () => void;
    onSelectClub: (club: Club) => void;
    onBrandFilterChange: (b: Brand) => void;
    onClubSheetOpenChange: (open: boolean) => void;
    zohoContactId: string | null;
    onContactCreated: (id: string) => void;
  }>,
) {
  const {
    firstName,
    lastName,
    email,
    phone,
    gender,
    selectedClub,
    brandFilter,
    isValid,
    isClubSheetOpen,
    onChangeFirstName,
    onChangeLastName,
    onChangeEmail,
    onChangePhone,
    onChangeGender,
    onNext,
    onSelectClub,
    onBrandFilterChange,
    onClubSheetOpenChange,
    zohoContactId,
    onContactCreated,
  } = props;
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(""); // User input OTP
  const [generatedOtp, setGeneratedOtp] = useState(""); // OTP generated & sent
  const [otpVerified, setOtpVerified] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [country, setCountry] = useState("ae"); // Fallback
    
  const {
    data: locations = [],
    isLoading,
    isError,
  } = useLocations({
    active: true,
  });

  // Derive brand from location name for frontend filtering:
  // - "Dubai" or "Ibiza" => Seven
  // - everything else => Gray
  const allClubs: Club[] = locations.map((loc) => {
    const name = (loc.name ?? loc.city ?? "").toLowerCase();
    const derivedBrand: Brand =
      name === "dubai" || name === "ibiza" ? "Seven" : "Gray";
    return {
      ...loc,
      brand: derivedBrand,
    };
  });

  const filteredClubs: Club[] = allClubs.filter((club) =>
    brandFilter === "Seven" ? club.brand === "Seven" : club.brand === "Gray",
  );

  const emailTrimmed = email.trim();
  const emailValid = /\S+@\S+\.\S+/.test(emailTrimmed);
  const phoneTrimmed = phone.trim();
  const phoneValid = phoneTrimmed.length >= 7;

  const firstNameError =
    attempted && !firstName.trim() ? "First name is required" : null;
  const lastNameError =
    attempted && !lastName.trim() ? "Last name is required" : null;

  let emailError: string | null = null;
  if (attempted) {
    if (!emailTrimmed) emailError = "Email is required";
    else if (!emailValid) emailError = "Please enter a valid email address";
  }

  let phoneError: string | null = null;
  if (attempted) {
    if (!phoneTrimmed) phoneError = "Phone number is required";
    else if (!phoneValid) phoneError = "Phone must be at least 7 characters";
  }

  const genderError =
  attempted && gender === null ? "Please select your gender" : null;

  const clubError = attempted && !selectedClub ? "Please select a club" : null;

    async function handleCreateContact() {
      if (!selectedClub) return;

      // If we already have a Zoho contact id for this flow, skip re-creating.
      if (zohoContactId) {
        onNext();
        return;
      }
      setCreatingContact(true);
      setContactError(null);

      try {
        const res = await fetch("/api/zoho/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone,
            locationId: selectedClub.id,
            Currency: selectedClub.currency,
            leadSource: "Website Membership",
          }),
        });

        const data: any = await res.json().catch(() => ({}));
        let memberId: string | null = null;

        // Contact created successfully
        if (res.ok && data?.data?.details?.id) {
          memberId = String(data.data.details.id);
          console.log("Use new Contact ID", memberId);
        }

        // Handle duplicate contact
        if (!memberId) {
          const duplicateError =
            data?.details?.data?.[0]?.details?.errors?.find(
              (err: any) => err.code === "DUPLICATE_DATA"
            );
          const duplicateId = duplicateError?.details?.duplicate_record?.id;
          if (duplicateId) memberId = String(duplicateId);
          console.log("Use Existing Contact ID", memberId);
        }

        if (!memberId) {
          setContactError(
            data?.message ||
              "We could not save your details. Please try again later."
          );
          return;
        }

        // Continue flow
        onContactCreated(memberId);
        onNext();
      } catch (err) {
        setContactError(
          "We could not save your details. Please try again later."
        );
      } finally {
        setCreatingContact(false);
      }
    }
    async function sendOtp(email: string) {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      setOtpSent(true); // Show OTP input
      try {
        const res = await fetch("/api/zoho/zeptomail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        });

        if (!res.ok) throw new Error("Failed to send OTP");
  
      } catch (err) {
        console.log("Error sending OTP. Please try again.");
      }
    }
    function verifyOtpBeforeContact() {
      //otp === generatedOtp
      if (true) {
        setOtpVerified(true);
        handleCreateContact(); // Proceed to create contact in Zoho
      } else {
            setContactError(
            "Invalid OTP. Please try again."
          );
      }
    }
  return (
    <div className="w-full max-w-none sm:max-w-2xl">
      <h2 className="text-xl sm:text-2xl font-semibold mb-2">
        3 steps, and you&apos;re in.
      </h2>
      <p className="text-sm text-muted-foreground mb-6 sm:mb-8">
        Tell us how to reach you, then choose your club and membership.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="space-y-1">
          <Input
            placeholder="First Name"
            value={firstName}
            onChange={(e) => onChangeFirstName(e.target.value)}
            className={firstNameError ? "border-destructive" : ""}
            aria-invalid={!!firstNameError}
            aria-describedby={firstNameError ? "firstName-error" : undefined}
          />
          {firstNameError && (
            <p id="firstName-error" className="text-xs text-destructive">
              {firstNameError}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Input
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => onChangeLastName(e.target.value)}
            className={lastNameError ? "border-destructive" : ""}
            aria-invalid={!!lastNameError}
            aria-describedby={lastNameError ? "lastName-error" : undefined}
          />
          {lastNameError && (
            <p id="lastName-error" className="text-xs text-destructive">
              {lastNameError}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-3 mb-4">
        <div className="space-y-1">
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => onChangeEmail(e.target.value)}
            className={emailError ? "border-destructive" : ""}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "email-error" : undefined}
          />
          {emailError && (
            <p id="email-error" className="text-xs text-destructive">
              {emailError}
            </p>
          )}
        </div>


        <div className="space-y-1">

           {/* Phone input */}

              <PhoneInput
                key = {country}
                defaultCountry={country}
                value={phone}
                onChange={(phone) => onChangePhone(phone)}
                  inputClassName="w-full h-14 border-border rounded-md text-sm"
                  countrySelectorStyleProps={{
                    buttonClassName: "h-11 border-border rounded-l-md bg-muted/50",
                  }}
     
              />
          

          {phoneError && (
            <p id="phone-error" className="text-xs text-destructive">
              {phoneError}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Gender</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChangeGender("male")}
              className={`flex-1 h-10 rounded-full border text-xs font-medium ${
                gender === "male"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              Male
            </button>
            <button
              type="button"
              onClick={() => onChangeGender("female")}
              className={`flex-1 h-10 rounded-full border text-xs font-medium ${
                gender === "female"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              Female
            </button>
          </div>
          {genderError && (
            <p className="text-xs text-destructive">{genderError}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Sheet open={isClubSheetOpen} onOpenChange={onClubSheetOpenChange}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={`w-full h-12 justify-between text-left font-medium ${clubError ? "border-destructive" : ""}`}
              aria-invalid={!!clubError}
              aria-describedby={clubError ? "club-error" : undefined}
            >
              <span>
                {selectedClub
                  ? `${selectedClub.name} • ${selectedClub.city}`
                  : "Select a Club to Join"}
              </span>
              <span className="text-lg leading-none">+</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-lg">
            <SheetHeader className="mb-6">
              <SheetTitle className="sr-only">Select a club</SheetTitle>
              <p className="text-xs text-muted-foreground">
                Choose your ideal home base. If you&apos;re torn between a few,
                a membership advisor can help you find a perfect fit.
              </p>
            </SheetHeader>

            {/* Brand pills – purely frontend filter */}
            <div className="flex gap-2 mb-5">
              {(["Seven"] as Brand[]).map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => onBrandFilterChange(brand)}
                  className={`px-3 py-1.5 text-xs rounded-full border ${
                    brandFilter === brand
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {brand?.toUpperCase()}

                </button>
              ))}
            </div>

            {/* Simple list of clubs for chosen brand */}
            <div className="space-y-3">
              {isLoading && (
                <p className="text-xs text-muted-foreground">
                  Loading locations…
                </p>
              )}
              {isError && !isLoading && (
                <p className="text-xs text-destructive">
                  Unable to load locations. Please try again later.
                </p>
              )}
              {!isLoading &&
                !isError &&
                filteredClubs.map((club) => (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => {
                      onSelectClub(club);
                      onClubSheetOpenChange(false);
                    }}
                    className="w-full flex items-center justify-between border border-border rounded-md px-4 py-3 text-left hover:border-foreground transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{club.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[club.city, club.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <span className="text-xs font-medium border px-3 py-1 rounded-full">
                      Select
                    </span>
                  </button>
                ))}
            </div>
          </SheetContent>
        </Sheet>
        {clubError && (
          <p id="club-error" className="text-xs text-destructive mt-1">
            {clubError}
          </p>
        )}
      </div>
  
        {otpSent && !otpVerified && (
          <div className="flex w-full items-start gap-2 mt-4">
            <div className="flex-1 space-y-1">
              <Input
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
              />
           
            </div>
            
            <Button
              type="button"
              onClick={verifyOtpBeforeContact}
              className="h-11 px-6 font-semibold shadow-sm"
              disabled={otp.length < 6 || creatingContact}
            >
              {creatingContact ? "Verifying..." : "Verify OTP"}
            </Button>
          </div>


        )} 

      <Button
        type="button"
        className="mt-6 w-full h-11 min-h-[44px]"
        disabled={creatingContact || otpSent}
        onClick={() => {
        // setAttempted(true); // ✅ trigger validation errors
        //  if (!isValid || !selectedClub) return;
          sendOtp(email); // Step 1: send OTP
        }}
      >
        {creatingContact
          ? "Saving your details…"
          : otpSent
          ? "OTP Sent"
          : "Continue to Membership"}
      </Button>


      {contactError && (
        <p className="mt-3 text-xs text-destructive">{contactError}</p>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        By clicking Continue, you agree that we may contact you regarding
        promotions, products, services, and other information that may interest
        you.
      </p>
    </div>
  );
}

function Step2ChooseMembership(props: {
  selectedClub: Club | null;
  selectedPlan: Plan | null;
  gender: Gender;
  isValid: boolean;
  onSelectPlan: (plan: Plan) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const {
    selectedClub,
    selectedPlan,
    gender,
    isValid,
    onSelectPlan,
    onBack,
    onNext,
  } = props;

  const brand: Brand = selectedClub?.brand ?? "Gray";
  const [activeTab, setActiveTab] = useState<"annual" | "pass">("annual");
  const [page, setPage] = useState(1);

  // Load real plans from Zoho via /api/zoho/subscription-plans
  const { data, isLoading, isError } = useSubscriptionPlans(
    {
      location: selectedClub?.name ?? "",
      brand,
      gender:
        gender === "male" ? "Male" : gender === "female" ? "Female" : undefined,
    },
    { enabled: !!selectedClub?.name },
  );

  // const allPlans: Plan[] =
  //   data?.plans.map((m: import("@/lib/api/types").Membership) => {
  //  let priceLabel = "";

  // if (m.duration === "Annual") { 
  // const monthly = Math.round((m.price / 12) * 100) / 100;
  // priceLabel = `${m.currency} ${monthly.toLocaleString(undefined, {
  //   minimumFractionDigits: 2,
  //   maximumFractionDigits: 2,
  // })} /month`;
  // } else {
  // const suffix = (() => {
  //   const n = (m.name ?? "").toLowerCase();
  //   if (n.includes("3 month")) return "/3 month";
  //   if (n.includes("6 month")) return "/6 month";
  //   if (n.includes("day")) return "/day";
  //   if (n.includes("week")) return "/week";
  //   if (n.includes("month")) return "/month";
  //   return "/month";
  // })();

  // priceLabel = `${m.currency} ${m.price.toLocaleString()} ${suffix}`;
  // }
  //     return {
  //       id: m.id,
  //       brand,
  //       name: m.name,
  //       price: priceLabel,
  //    //   price: `${m.currency} ${m.price.toLocaleString()} ${suffix}`,
  //       annual_price:m.price,
  //       description: m.benefits.join(", ") || m.duration,
  //       amount: m.price,
  //       currency: m.currency,
  //       duration: m.duration as "Annual" | "Pass",
  //       tax_percentage: m.tax_percentage, // ✅ add this
  //       number_of_days: m.number_of_days, // ✅ add this
  //     };
  //   }) ?? [];
const allPlans: Plan[] =
  data?.plans.map((m: import("@/lib/api/types").Membership) => {
    // Normalize duration
    const duration = m.duration === "Annual" ? "Annual" : "Pass";

    // Use number_of_days dynamically for Pass, or 365 for Annual
    let number_of_days = duration === "Annual" ? 365 : m.number_of_days;

    // Only allow valid number_of_days for Pass
    const allowedPassDays = [1, 7, 30, 90, 180];
    if (duration === "Pass" && !allowedPassDays.includes(number_of_days)) {
      number_of_days = 30; // fallback default
    }

    // Calculate priceLabel
    let priceLabel = "";
    if (duration === "Annual") {
      const monthly = Math.round((m.price / 12) * 100) / 100;
      priceLabel = `${m.currency} ${monthly.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} /month`;
    } else if (duration === "Pass") {
      if (number_of_days === 1) {
        priceLabel = `${m.currency} ${m.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} /day`;
      } else if (number_of_days === 7) {
        const weekly = Math.round((m.price / 7) * 100) / 100;
        priceLabel = `${m.currency} ${weekly.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} /week`;
      } else {
        const months = number_of_days / 30; // 30→1, 90→3, 180→6
        const monthly = Math.round((m.price / months) * 100) / 100;
        priceLabel = `${m.currency} ${monthly.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} /month`;
      }
    }

    return {
      id: m.id,
      brand,
      name: m.name,
      price: priceLabel,
      annual_price: m.price,
      description: m.benefits.join(", ") || duration,
      amount: m.price,
      currency: m.currency,
      duration: duration as "Annual" | "Pass",
      tax_percentage: m.tax_percentage,
      number_of_days,
    };
  }) ?? [];
  // For Dubai location: only show Annual plans (no Pass tab)
  const isDubai = selectedClub?.name === "Dubai";

  const annualPlans = allPlans.filter((p) => p.duration !== "Pass");
  const passPlans = isDubai
    ? []
    : allPlans.filter((p) => p.duration === "Pass");

  // Frontend pagination (many plans, no backend pagination yet)
  useEffect(() => {
    setPage(1);
  }, [selectedClub, activeTab]);

  const PLANS_PER_PAGE = 5;
  const totalDubaiPages = Math.max(
    1,
    Math.ceil(annualPlans.length / PLANS_PER_PAGE),
  );
  const safePage = Math.min(page, totalDubaiPages || 1);
  const startIndex = (safePage - 1) * PLANS_PER_PAGE;
  const visibleDubaiPlans = annualPlans.slice(
    startIndex,
    startIndex + PLANS_PER_PAGE,
  );

  return (
    <div className="w-full max-w-none sm:max-w-2xl">
      <h2 className="text-xl sm:text-2xl font-semibold mb-2">
        Choose Membership
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Plans available for{" "}
        {selectedClub ? selectedClub.name : "your selected club"}.
      </p>

      {isError && !isLoading && (
        <p className="text-sm text-destructive mb-4">
          We couldn&apos;t load plans right now. Please try again later.
        </p>
      )}

      {/* For Dubai: show only Annual plans, no tabs */}
      {isDubai ? (
        <div className="mb-6">
          {(() => {
            if (isLoading) {
              return (
                <p className="text-sm text-muted-foreground py-4">
                  Loading plans…
                </p>
              );
            }
            if (annualPlans.length === 0) {
              return (
                <p className="text-sm text-muted-foreground py-4">
                  No annual plans available for this location.
                </p>
              );
            }
            return (
              <>
                <div className="space-y-4">
                  {visibleDubaiPlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => onSelectPlan(plan)}
                      className={`w-full text-left border-2 rounded-md px-4 sm:px-5 py-3 sm:py-4 transition-colors ${
                        selectedPlan?.id === plan.id
                          ? "border-foreground"
                          : "border-border hover:border-foreground/60"
                      }`}
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold">
                            {plan.name}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 sm:line-clamp-none">
                            {plan.description}
                          </p>
                        </div>
                        <p className="text-sm font-semibold shrink-0">
                          {plan.price}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                {totalDubaiPages > 1 && (
                  <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className={`min-h-[44px] px-4 py-2 sm:py-1 border rounded touch-manipulation ${
                        safePage === 1
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-muted cursor-pointer"
                      }`}
                    >
                      Previous
                    </button>
                    <span className="text-center">
                      Page {safePage} of {totalDubaiPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((p) => Math.min(totalDubaiPages, p + 1))
                      }
                      disabled={safePage === totalDubaiPages}
                      className={`min-h-[44px] px-4 py-2 sm:py-1 border rounded touch-manipulation ${
                        safePage === totalDubaiPages
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-muted cursor-pointer"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "annual" | "pass")}
          className="mb-6 w-full"
        >
          <TabsList className="mb-4 w-full grid grid-cols-2">
            <TabsTrigger value="annual" className="text-xs sm:text-sm">
              Annual
            </TabsTrigger>
            <TabsTrigger value="pass" className="text-xs sm:text-sm">
              Pass
            </TabsTrigger>
          </TabsList>

          {(["annual", "pass"] as const).map((tab) => {
            const plansForTab = tab === "annual" ? annualPlans : passPlans;

            if (isLoading) {
              return (
                <TabsContent key={tab} value={tab}>
                  <p className="text-sm text-muted-foreground py-4">
                    Loading plans…
                  </p>
                </TabsContent>
              );
            }

            if (plansForTab.length === 0) {
              return (
                <TabsContent key={tab} value={tab}>
                  <p className="text-sm text-muted-foreground py-4">
                    No {tab} plans available for this location.
                  </p>
                </TabsContent>
              );
            }

            const totalPages = Math.max(
              1,
              Math.ceil(plansForTab.length / PLANS_PER_PAGE),
            );
            const safeTabPage = Math.min(page, totalPages || 1);
            const start = (safeTabPage - 1) * PLANS_PER_PAGE;
            const visiblePlans = plansForTab.slice(
              start,
              start + PLANS_PER_PAGE,
            );

            return (
              <TabsContent key={tab} value={tab}>
                <div className="space-y-4">
                  {visiblePlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => onSelectPlan(plan)}
                      className={`w-full text-left border-2 rounded-md px-4 sm:px-5 py-3 sm:py-4 transition-colors ${
                        selectedPlan?.id === plan.id
                          ? "border-foreground"
                          : "border-border hover:border-foreground/60"
                      }`}
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold">
                            {plan.name}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 sm:line-clamp-none">
                            {plan.description}
                          </p>
                        </div>
                        <p className="text-sm font-semibold shrink-0">
                          {plan.price}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safeTabPage === 1}
                      className={`min-h-[44px] px-4 py-2 sm:py-1 border rounded touch-manipulation ${
                        safeTabPage === 1
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-muted cursor-pointer"
                      }`}
                    >
                      Previous
                    </button>
                    <span className="text-center">
                      Page {safeTabPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safeTabPage === totalPages}
                      className={`min-h-[44px] px-4 py-2 sm:py-1 border rounded touch-manipulation ${
                        safeTabPage === totalPages
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-muted cursor-pointer"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full sm:w-auto"
        >
          Back
        </Button>
        <Button
          type="button"
          className="w-full sm:flex-1 min-h-[44px]"
          disabled={!isValid || isLoading || isError}
          onClick={onNext}
        >
          Continue to Review
        </Button>
      </div>
    </div>
  );
}

function Step3ReviewPay(
  props: Readonly<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    club: Club | null;
    plan: Plan | null;
    memberId: string | null;
    onBack: () => void;
    onRestart: () => void;
  }>,
) {
  const {
    firstName,
    lastName,
    email,
    phone,
    club,
    plan,
    memberId,
    onBack,
    onRestart,
  } = props;
  const [nameOnCard, setNameOnCard] = useState("");
  const [completed, setCompleted] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponInfo, setCouponInfo] = useState<{
    id?: string;
    name: string;
    discountType: "percentage" | "amount";
    value: number;
  } | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  // const stripe = useStripe();
  // const elements = useElements();
  const publishableKey = getStripePublishableKeyForClub(club);

  const stripePromise = useMemo(() => {
    if (typeof window === "undefined" || !publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);


  const baseAmount = plan?.amount ?? 0;
  // Tax %
   const taxPercentage = plan?.tax_percentage ?? 0;
  const discountAmount = (() => {
    if (!plan || !couponInfo || !couponInfo.value) return 0;
    if (couponInfo.discountType === "percentage") {
      return Math.round((baseAmount * couponInfo.value) / 100);
    }
    return Math.round(couponInfo.value);
  })();

  const totalAfterDiscount = Math.max(0, baseAmount - discountAmount);
  const hasDiscount = !!plan && discountAmount > 0;
  let effectiveTotal = hasDiscount ? totalAfterDiscount : baseAmount;
  // Tax calculation
  const taxAmount = Math.round((effectiveTotal * taxPercentage) / 100);

  // Final total
  effectiveTotal = effectiveTotal + taxAmount;

   const createCRMsubscription = async (reference:String) => {
    if (!plan || !club) return;

    try {
   const start = new Date();
    const startDate = start.toISOString().slice(0, 10);

    const end = new Date(start);

    switch (plan?.number_of_days) {
      case 1:
        end.setDate(end.getDate() + 1); // +1 day
        break;

      case 7:
        end.setDate(end.getDate() + 7); // +1 week
        break;

      case 30:
        end.setMonth(end.getMonth() + 1); // +1 month
        break;

      case 90:
        end.setMonth(end.getMonth() + 3); // +3 months
        break;

      case 180:
        end.setMonth(end.getMonth() + 6); // +6 months
        break;

      case 365:
        end.setFullYear(end.getFullYear() + 1); // +1 year
        break;

      default:
        console.log("Unsupported plan duration");
    }

    const endDate = end.toISOString().slice(0, 10);

      // 2) Charge card using backend and sync Zoho
      const res = await fetch("/api/zoho/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: club.name, // "Dubai", "Ibiza", "Gray Dubai"
          amount: effectiveTotal || baseAmount,
          currency: plan.currency,
          locationId: club.id,
          planId: plan.id,
          planDuration: plan.duration ?? "Annual",
          couponId: couponInfo?.id ?? undefined,
          couponDiscount: couponInfo?.value ?? undefined,
          memberId: memberId ?? undefined,
          startDate,
          endDate,
          subscriptionStatus: 'live',
          paymentMode: 'Stripe',
          paymentReference:reference?? '',
     
        }),
      });

      const data = await res.json().catch(() => ({}));
     if (!res.ok || data?.data?.status !== "success") {
      console.log("Subscription Creation Error", data);
      return;
    }

     console.log("Subscription Created Successfully", data.data.details.id);
    } catch (err) {
      console.error("catch Subscription Creation Error", err);
     
    } finally {
     // setSubmitting(false);
    }
  };

   return (
  

  <div className="w-full max-w-none sm:max-w-3xl space-y-6">
   <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        Step 3 of 3
     </p>
       <h2 className="text-xl sm:text-2xl font-semibold">Review and Pay</h2>
       <p className="text-xs text-muted-foreground">
         Confirm your membership details and complete your secure payment.
       </p>
    </div>


      <div className="space-y-4">
        <div className="border border-border rounded-xl p-4 sm:p-5 bg-card/60 shadow-sm">
         <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-3">
            <div>
              <h3 className="text-sm font-semibold">Membership summary</h3>
            </div>
 
         </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Club</span>
             <span>{club ? `${club.name} • ${club.city}` : "—"}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
             <span className="text-muted-foreground">Plan</span>
           <span>{plan?.name ?? "—"}</span>
           </div>
          <div className="flex justify-between text-sm">
             <span className="text-muted-foreground">Sub Total</span>
            <span>{ plan?.currency } { baseAmount }</span>
          </div>
             {plan && hasDiscount && (
            <>
              <div className="flex justify-between text-  sm mt-2">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-destructive">
                  - {plan.currency} {discountAmount.toLocaleString()}
                </span>
              </div>
      
            </>
          )}
          {plan && taxPercentage && (
            <>
              <div className="mt-2 pt-2 border-t border-border flex justify-between text-sm font-semibold">
                <span>Tax</span>
                <span>
               
                 ({taxPercentage.toLocaleString()}%) {plan.currency} {taxAmount.toLocaleString()}
                </span>
              </div>
            </>
          )}

            <div className="mt-2 pt-2 border-t border-border flex justify-between text-sm font-semibold">
                <span>Grand Total</span>
                <span>
               
              {plan && effectiveTotal > 0
                  ? `${plan.currency} ${effectiveTotal.toLocaleString()} annually`
                  : plan
                    ? plan.price
                    : "—"}
                </span>
              </div>
      
        </div>

        <div className="border border-border rounded-xl p-4 sm:p-5 bg-card/40">
          <h3 className="text-sm font-semibold mb-3">Your details</h3>
          <dl className="space-y-2 sm:space-y-1 text-sm">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-muted-foreground shrink-0">Name</dt>
              <dd className="break-words">
                {[firstName, lastName].filter(Boolean).join(" ") || "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-muted-foreground shrink-0">Email</dt>
              <dd className="break-all">{email || "—"}</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-muted-foreground shrink-0">Phone</dt>
              <dd>{phone || "—"}</dd>
            </div>
          </dl>
          {contactError && (
            <p className="mt-2 text-xs text-destructive">{contactError}</p>
          )}
        </div>
      </div>

      <div className="border border-border rounded-xl p-4 sm:p-5 space-y-4 bg-card/80 shadow-sm">

     

       
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Coupon
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.trim());
                setCouponError(null);
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!couponCode || couponApplying}
              onClick={async () => {
                if (!couponCode || !plan) return;
                setCouponApplying(true);
                setCouponError(null);
                try {
                  const res = await fetch("/api/zoho/coupons/validate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      code: couponCode,
                      planId: plan.id,
                      planPrice: plan.amount,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok || !data.valid) {
                    setCouponInfo(null);
                    setCouponError(data.message || "Coupon is not valid.");
                  } else {
                    setCouponInfo({
                      id: data.couponId,
                      name: data.name,
                      discountType: data.discountType,
                      value: data.value ?? data.discount,
                    });
                  }
                } catch (err) {
                  setCouponInfo(null);
                  setCouponError("Unable to apply coupon. Please try again.");
                } finally {
                  setCouponApplying(false);
                }
              }}
            >
              {couponApplying ? "Applying…" : "Apply"}
            </Button>
          </div>
          {couponInfo && (
            <p className="text-xs text-green-700 dark:text-green-400">
              Coupon “{couponCode}” applied.
            </p>
          )}
          {couponError && (
            <p className="text-xs text-destructive">{couponError}</p>
          )}
        </div>

        {/* {paymentError && (
          <p className="text-xs text-destructive mt-1">{paymentError}</p>
        )} */}
      </div>
       {/* <div style={{ maxWidth: '500px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif' }}>
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
      </div> */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full sm:w-auto"
        >
          Back
        </Button>


      <Button
      type="button"
      className="w-full sm:w-auto"
      disabled={creatingPayment}
      onClick={async () => {
        if (creatingPayment) return;

        setPaymentMessage(null);

        if (!club || !plan) {
          setPaymentMessage("Please select a club and plan.");
          return;
        }

        if (!publishableKey || !stripePromise) {
          setPaymentMessage("Payment system is still loading. Please try again.");
          return;
        }

        try {
          setCreatingPayment(true);

          const res = await fetch("/api/test-create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: club?.name,
              amount: effectiveTotal || baseAmount,
              currency: plan?.currency,
              description: plan?.name,
              firstName,
              lastName,
              email,
              phone,
              zohoLocationId: club?.id,
              planId: plan?.id,
              planDuration: plan?.duration ?? "Annual",
              couponId: couponInfo?.id ?? undefined,
              couponDiscount: couponInfo?.value ?? undefined,
              existingMemberId: memberId ?? undefined,
            }),
          });

          if (!res.ok) {
            throw new Error("Failed to create payment.");
          }

          const data = await res.json();

          if (!data?.clientSecret) {
            throw new Error("Invalid payment session.");
          }

          setClientSecret(data.clientSecret);
          setShowPaymentModal(true);

        } catch (err) {
          setPaymentMessage("Unable to start payment. Please try again.");
        } finally {
          setCreatingPayment(false);
        }
      }}
    >
      {creatingPayment ? "Preparing payment..." : "Complete Purchase"}
    </Button>
      </div>
        {paymentMessage && (
          <p className="text-xs text-destructive mt-2">
            {paymentMessage}
          </p>
        )}
      {/* {showPaymentModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">

      <button
        onClick={() => setShowPaymentModal(false)}
        className="absolute top-3 right-3 text-gray-500 hover:text-black"
      >
        ✕
      </button>

      <h2 className="text-lg font-semibold mb-4">
        Complete your payment
      </h2>

      {!clientSecret ? (
        <p className="text-sm text-gray-500">Loading payment...</p>
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm />
        </Elements>
      )}

    </div>
  </div>
        )} */}

     <AnimatePresence>
  {showPaymentModal && (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative my-8"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >

        <button
          onClick={() => setShowPaymentModal(false)}
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold mb-4">
          Complete your payment
        </h2>

        {!clientSecret ? (
          <p className="text-sm text-gray-500">Loading payment...</p>
        ) : (
          <Elements
            stripe={stripePromise} 
            options={{ clientSecret, appearance: { theme: 'stripe' } }}
          >
            <CheckoutForm />
          </Elements>
        )}

      </motion.div>
    </motion.div>
  )}
     </AnimatePresence>
    </div>
    );
    

    // Sub-component used inside the Elements provider
      function CheckoutForm() {
        const stripe = useStripe();
        const elements = useElements();
        const [message, setMessage] = useState<string | null>(null);
        const [ready, setReady] = useState(false); // <-- track when PaymentElement is ready

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!stripe || !elements) return;

          const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: `${window.location.origin}/thankyou?payment=success` },
            redirect: 'if_required', // prevent automatic redirect
          });

          if (error) {
            setMessage(error.message || "An error occurred");
          } else if (paymentIntent && paymentIntent.status === "succeeded") {
                const paymentReference = paymentIntent.id; // PaymentIntent ID
                console.log("Payment successful!");
                console.log("Reference (PaymentIntent ID):", paymentReference);
                //createCRMsubscription(paymentReference);
                window.location.href = "/thankyou?payment=success";
          }
        };

        return (
          <form onSubmit={handleSubmit}>
            <PaymentElement
              onReady={() => setReady(true)} // <-- only show button after ready
            />
            
            {/* show button only when ready */}
            {ready && (
              <button
                disabled={!stripe}
                style={{
                  marginTop: '20px',
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                Pay Now
              </button>
            )}

            {/* optional: show loading text while Stripe is initializing */}
            {!ready && <p style={{ marginTop: '10px', color: '#6b7280' }}>Loading payment fields…</p>}

            {message && <p style={{ color: 'red', marginTop: '10px' }}>{message}</p>}
          </form>
        );
      }
}
