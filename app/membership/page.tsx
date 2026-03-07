"use client";

import { useState, useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

type Step = 1 | 2 | 3;

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

  if (name.includes("gray")) {
    key = STRIPE_PK_GRAY;
    bucket = "gray";
  } else if (name.includes("ibiza")) {
    key = STRIPE_PK_IBIZA;
    bucket = "ibiza";
  } else {
    // Default all other clubs to Dubai / Seven account
    key = STRIPE_PK_DUBAI;
    bucket = "dubai";
  }

  return key;
}

export default function MembershipPage() {
  const [step, setStep] = useState<Step>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [brandFilter, setBrandFilter] = useState<Brand>("Seven");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isClubSheetOpen, setIsClubSheetOpen] = useState(false);
  const [gender, setGender] = useState<Gender>(null);
  const [zohoContactId, setZohoContactId] = useState<string | null>(null);

  const publishableKey = getStripePublishableKeyForClub(selectedClub);

  const stripePromise = useMemo(() => {
    if (typeof window === "undefined" || !publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

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
      Seven
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
          <StepPill index={3} label="Review & Pay" active={step === 3} />
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

        {step === 3 && stripePromise && selectedClub && selectedPlan && (
          <Elements stripe={stripePromise}>
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
          </Elements>
        )}
        {step === 3 && (!publishableKey || !stripePromise) && (
          <div className="max-w-3xl">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">
              Payments temporarily unavailable
            </h2>
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t initialize the payment system for this club. Please try another
              location or contact support.
            </p>
          </div>
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

  const [creatingContact, setCreatingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

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
          <Input
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => onChangePhone(e.target.value)}
            className={phoneError ? "border-destructive" : ""}
            aria-invalid={!!phoneError}
            aria-describedby={phoneError ? "phone-error" : undefined}
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
                  {brand}
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

      <Button
        type="button"
        className="mt-6 w-full h-11 min-h-[44px]"
        disabled={creatingContact}
        onClick={async () => {
          setAttempted(true);
          if (!isValid || !selectedClub) return;

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
                leadSource: "Website Membership",
              }),
            });
            const data: any = await res.json().catch(() => ({}));

            if (!res.ok || !data?.data?.details?.id) {
              setContactError(
                data?.message ||
                  "We could not save your details in our system. Please try again in a moment.",
              );
              return;
            }

            const memberId = String(data.data.details.id);
            onContactCreated(memberId);
            onNext();
          } catch (err) {
            setContactError(
              "We could not save your details in our system. Please try again in a moment.",
            );
          } finally {
            setCreatingContact(false);
          }
        }}
      >
        {creatingContact ? "Saving your details…" : "Continue to Membership"}
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

  const allPlans: Plan[] =
    data?.plans.map((m: import("@/lib/api/types").Membership) => {
      const suffix =
        m.duration === "Pass"
          ? (() => {
              const n = (m.name ?? "").toLowerCase();
              if (n.includes("3 month")) return "/3 month";
              if (n.includes("6 month")) return "/6 month";
              if (n.includes("day")) return "/day";
              if (n.includes("week")) return "/week";
              if (n.includes("month")) return "/month";
              return "/month";
            })()
          : "/year";
      return {
        id: m.id,
        brand,
        name: m.name,
        price: `${m.currency} ${m.price.toLocaleString()} ${suffix}`,
        description: m.benefits.join(", ") || m.duration,
        amount: m.price,
        currency: m.currency,
        duration: m.duration as "Annual" | "Pass",
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

  const stripe = useStripe();
  const elements = useElements();

  if (completed) {
    return (
      <div className="max-w-md space-y-4">
        <div>
          <h2 className="text-2xl font-semibold mb-1">You&apos;re all set.</h2>
          <p className="text-sm text-muted-foreground">
            Your payment was successful and your membership has been created.
          </p>
        </div>
        <Button type="button" className="w-full" onClick={onRestart}>
          Start over
        </Button>
            <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-md text-center">
              <p className="text-sm mb-2">
                Download our app using the QR code:
              </p>
              <img
                src="/images/seven-qr-code.png" 
                alt="QR code to download the app"
                className="mx-auto w-32 h-32"
              />
            </div>
      </div>
    );
  }

  const baseAmount = plan?.amount ?? 0;

  const discountAmount = (() => {
    if (!plan || !couponInfo || !couponInfo.value) return 0;
    if (couponInfo.discountType === "percentage") {
      return Math.round((baseAmount * couponInfo.value) / 100);
    }
    return Math.round(couponInfo.value);
  })();

  const totalAfterDiscount = Math.max(0, baseAmount - discountAmount);
  const hasDiscount = !!plan && discountAmount > 0;
  const effectiveTotal = hasDiscount ? totalAfterDiscount : baseAmount;

  const canSubmit = !!plan && !!club && !!nameOnCard.trim() && !submitting;

  const handleSubmit = async () => {
    if (!plan || !club) return;

    if (!stripe || !elements) {
      setPaymentError(
        "Payment system is still loading. Please try again in a moment.",
      );
      return;
    }

    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) {
      // eslint-disable-next-line no-console
      console.error("CardNumberElement not found when submitting payment.");
      setPaymentError(
        "Card details are not ready. Please refresh the page and try again.",
      );
      return;
    }

    setPaymentError(null);
    setContactError(null);
    setSubmitting(true);
    try {
      // 1) Create PaymentMethod from the card element
      const pmResult = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: nameOnCard || undefined,
          email: email || undefined,
          phone: phone || undefined,
        } as any,
      });

      if (pmResult.error || !pmResult.paymentMethod) {
        setPaymentError(
          pmResult.error?.message || "Unable to create payment method.",
        );
        return;
      }

      const paymentMethodId = pmResult.paymentMethod.id;

      // 2) Charge card using backend and sync Zoho
      const res = await fetch("/api/payments/direct-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: club.name, // "Dubai", "Ibiza", "Gray Dubai"
          amount: totalAfterDiscount || baseAmount,
          currency: plan.currency,
          description: plan.name,
          paymentMethodId,
          firstName,
          lastName,
          email,
          phone,
          zohoLocationId: club.id,
          planId: plan.id,
          planDuration: plan.duration ?? "Annual",
          couponId: couponInfo?.id ?? undefined,
          couponDiscount: couponInfo?.value ?? undefined,
          existingMemberId: memberId ?? undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success !== true) {
        setPaymentError(
          data?.error ||
            "Payment could not be completed. Please try again or contact support.",
        );
        return;
      }

      setCompleted(true);
    } catch (err) {
      console.error("Direct card payment failed", err);
      setPaymentError("Unexpected error processing payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-none sm:max-w-3xl space-y-6">
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Step 3 of 3
        </p>
        <h2 className="text-xl sm:text-2xl font-semibold">Review &amp; Pay</h2>
        <p className="text-xs text-muted-foreground">
          Confirm your membership details and complete your secure payment.
        </p>
      </div>

      {/* Summary cards */}
      <div className="space-y-4">
        <div className="border border-border rounded-xl p-4 sm:p-5 bg-card/60 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-3">
            <div>
              <h3 className="text-sm font-semibold">Membership summary</h3>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Total due today
              </p>
              <p className="text-lg font-semibold">
                {plan && effectiveTotal > 0
                  ? `${plan.currency} ${effectiveTotal.toLocaleString()}`
                  : plan
                    ? plan.price
                    : "—"}
              </p>
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
            <span className="text-muted-foreground">Price</span>
            <span>{plan?.price ?? "—"}</span>
          </div>
          {plan && hasDiscount && (
            <>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Coupon discount</span>
                <span className="text-destructive">
                  - {plan.currency} {discountAmount.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-border flex justify-between text-sm font-semibold">
                <span>Total after coupon</span>
                <span>
                  {plan.currency} {totalAfterDiscount.toLocaleString()}
                </span>
              </div>
            </>
          )}
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold mb-1">
              Payment &amp; billing
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Enter your coupon (if you have one), then confirm your billing
              name, ZIP and card details.
            </p>
          </div>
          <p className="hidden text-[11px] text-muted-foreground sm:block shrink-0">
            Secure card processing powered by Stripe.
          </p>
        </div>

        {/* Coupon */}
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
              Coupon “{couponInfo.name}” applied.
            </p>
          )}
          {couponError && (
            <p className="text-xs text-destructive">{couponError}</p>
          )}
        </div>

        {/* Billing name */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Billing details
          </label>
          <Input
            placeholder="Name on card"
            value={nameOnCard}
            onChange={(e) => setNameOnCard(e.target.value)}
          />
        </div>

        {/* Card number, expiry and CVC as separate boxes; ZIP below */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Card details
          </label>
          <div className="space-y-2">
            <div className="border border-border rounded-md px-3 py-2 bg-background min-h-[38px] w-full [&>div]:min-h-[22px] [&>div]:w-full">
              <CardNumberElement
                options={{
                  style: {
                    base: {
                      fontSize: "14px",
                      color: "var(--foreground)",
                      "::placeholder": { color: "#9ca3af" },
                    },
                    invalid: { color: "#ef4444" },
                  },
                }}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="border border-border rounded-md px-3 py-2 bg-background min-h-[38px] w-full [&>div]:min-h-[22px] [&>div]:w-full">
                <CardExpiryElement
                  options={{
                    style: {
                      base: {
                        fontSize: "14px",
                        color: "var(--foreground)",
                        "::placeholder": { color: "#9ca3af" },
                      },
                      invalid: { color: "#ef4444" },
                    },
                  }}
                />
              </div>
              <div className="border border-border rounded-md px-3 py-2 bg-background min-h-[38px] w-full [&>div]:min-h-[22px] [&>div]:w-full">
                <CardCvcElement
                  options={{
                    style: {
                      base: {
                        fontSize: "14px",
                        color: "var(--foreground)",
                        "::placeholder": { color: "#9ca3af" },
                      },
                      invalid: { color: "#ef4444" },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {paymentError && (
          <p className="text-xs text-destructive mt-1">{paymentError}</p>
        )}
      </div>

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
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Completing…" : "Complete Purchase"}
        </Button>
      </div>
    </div>
  );
}
