/** API location – GET /api/v1/locations response item */
export interface ApiLocation {
  id: number;
  name: string;
  brand?: string;
  description?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LocationsResponse {
  success?: boolean;
  message?: string;
  data?: ApiLocation[];
}

/** UI location (Zoho/membership flow) */
export interface Location {
  id: string;
  name: string;
  brand: string;
  city: string;
  country: string;
  currency: string;
}

/** UI membership plan (Zoho/membership flow) */
export interface Membership {
  id: string;
  name: string;
  benefits: string[];
  duration: string;
  price: number;
  currency: string;
  tax_percentage: number;
  number_of_days: number;
}

/** Signup – POST /api/v1/members/auth/signup */
export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  homeClubLocation: string;
}

export interface SignupResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
}

/** OTP generate (phone) – POST /api/v1/members/auth/otp/generate */
export interface OtpGenerateRequest {
  phone: string;
}

/** OTP generate (email) – send OTP to email; phone optional but sent when provided */
export interface OtpGenerateEmailRequest {
  email: string;
  phone?: string;
}

/** OTP verify (phone) – POST /api/v1/members/auth/otp/verify */
export interface OtpVerifyRequest {
  phone: string;
  otp: string;
  deviceInfo: {
    os: string;
    osVersion: string;
    deviceModel: string;
    appVersion: string;
  };
}

/** OTP verify (email) – POST /api/v1/members/auth/otp/verify with email and phone (required by API) */
export interface OtpVerifyEmailRequest {
  email: string;
  phone: string;
  otp: string;
  deviceInfo: {
    os: string;
    osVersion: string;
    deviceModel: string;
    appVersion: string;
  };
}

/** Member object returned inside OTP verify response.data */
export interface OtpVerifyMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImage?: string | null;
  location?: string;
  gender?: string;
  membershipId?: string;
  accountStatus?: string;
  membershipType?: string | null;
  apcId?: string | null;
  [key: string]: unknown;
}

export interface OtpVerifyResponse {
  success?: boolean;
  message?: string;
  data?: {
    member?: OtpVerifyMember;
    accessToken?: string;
    refreshToken?: string;
    token?: string;
    refresh_token?: string;
    expiresIn?: string;
    [key: string]: unknown;
  };
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
}

/** Refresh – POST /api/v1/members/auth/refresh */
export interface RefreshRequest {
  refreshToken: string;
}

/** Email verification */
export interface VerifyEmailRequest {
  email: string;
  code: string;
  token?: string;
}
export interface VerifyEmailResponse {
  message?: string;
  verified?: boolean;
  [key: string]: unknown;
}

/** Sign-in */
export interface SignInRequest {
  email: string;
  password: string;
}
export interface SignInResponse {
  access_token?: string;
  token?: string;
  user?: UserProfile;
  data?: { access_token: string; user: UserProfile };
  [key: string]: unknown;
}

/** User profile (after login) */
export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  gender?: string;
  location?: string;
  location_id?: string;
  email_verified?: boolean;
  [key: string]: unknown;
}

/** Subscription plan – Zoho CRM Subscription_Plans module item */
export interface SubscriptionPlanItem {
  id: string | number;
  Name?: string;
  /** Preferred display name in app, if configured */
  App_Display_Name?: string;
  Status?: string;
  Brand?: string[];
  /** Zoho may return Location as array of names or as lookup object */
  Location?: string[] | { name?: string; id?: string };
  Parking_Location?: string | null;
  Gender?: string[];
  Plan_Category?: string;
  Price?: number;
  Setup_Fee?: number | null;
  Currency?: string;
  Plan_Description?: string;
  Subscription_Frequency?: string;
  [key: string]: unknown;
}

export interface SubscriptionPlansResponse {
  success?: boolean;
  message?: string;
  data?: SubscriptionPlanItem[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  [key: string]: unknown;
}

export interface ProfileResponse {
  data?: UserProfile;
  user?: UserProfile;
}

/** Card details for create-intent. Send as `card` object so backend can create a Stripe PaymentMethod; do not put in paymentMethodId (that must be a Stripe pm_xxx id). */
export interface CreateIntentCardDetails {
  pan: string;
  expiry: string;
  cvv: string;
  cardholderName: string;
}

/** POST /api/v1/payments/create-intent request body */
export interface CreateIntentRequest {
  memberRecordId: string;
  amount: number;
  currency: string;
  /** Stripe PaymentMethod id (pm_xxx) when using PaymentSheet; omit when sending raw card in `card`. */
  paymentMethodId?: string;
  /** Raw card details; backend should create a PaymentMethod from this and use it for the intent. */
  card?: CreateIntentCardDetails;
  brand: string;
  location: string;
  invoiceNumber: string;
  description: string;
  paymentType: string;
  subscriptionPlanName: string;
  serviceName?: string;
  creditType?: string;
}

/** POST /api/v1/payments/create-intent response */
export interface CreateIntentResponse {
  success?: boolean;
  message?: string;
  clientSecret?: string;
  paymentIntentId?: string;
  requiresAction?: boolean;
  [key: string]: unknown;
}

/** POST /api/v1/subscriptions request body – create subscription record after successful payment */
export interface CreateSubscriptionRequest {
  planName: { id: string };
  memberName: { id: string };
  subscriptionMode: string;
  paymentMode: string;
  startDate: string;
  endDate: string;
  subscriptionStatus: string;
  price: number;
  couponCode?: { id: string };
  paymentReference: string;
}

export interface CreateSubscriptionResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
}

/** GET /api/v1/schedules – schedule item */
export interface ScheduleItem {
  id: string;
  classScheduleName?: string;
  trainerName?: string;
  trainerId?: string;
  bookedSlots?: number;
  slots?: number;
  classType?: string;
  location?: string;
  serviceArea?: string;
  serviceAreaId?: string;
  startDateTime?: string;
  durationMins?: number;
  imageUrl?: string;
  [key: string]: unknown;
}

export interface SchedulesResponse {
  success?: boolean;
  message?: string;
  data?: {
    schedules?: ScheduleItem[];
    pagination?: { page: number; perPage: number; total: number; hasMore?: boolean };
  };
  [key: string]: unknown;
}

/** GET /api/v1/trial-bookings/{memberId} – single trial booking (in list) */
export interface TrialBookingItem {
  id?: string;
  brand?: string;
  location?: string;
  dateTime?: string;
  status?: string;
  [key: string]: unknown;
}

export interface GetTrialBookingsResponse {
  success?: boolean;
  message?: string;
  data?: TrialBookingItem[] | { bookings?: TrialBookingItem[] };
  [key: string]: unknown;
}

/** POST /api/v1/trial-bookings/{memberId} request body */
export interface TrialBookingRequest {
  brand: string;
  location: string;
  dateTime: string;
  status?: string;
}

export interface TrialBookingResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
}

/** POST /api/v1/coupons/validate request body */
export interface ValidateCouponRequest {
  couponCode: string;
  subscriptionPlanId: string;
}

/** Coupon validation response data */
export interface ValidateCouponData {
  id?: string;
  name?: string;
  status?: string;
  discount?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  valid?: boolean;
  validForPlan?: boolean;
  [key: string]: unknown;
}

export interface ValidateCouponResponse {
  success?: boolean;
  message?: string;
  data?: ValidateCouponData;
  [key: string]: unknown;
}
