import { NextResponse } from 'next/server'

const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token'
const ZOHO_SUBSCRIPTIONS_URL = 'https://www.zohoapis.com/crm/v8/Subscriptions'

let cachedAccessToken: string | null = null
let cachedExpiry = 0

async function getZohoAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedAccessToken && cachedExpiry > now + 5_000) {
    return cachedAccessToken
  }

  const clientId = process.env.ZOHO_CLIENT_ID
  const clientSecret = process.env.ZOHO_CLIENT_SECRET
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Zoho OAuth env vars are not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const res = await fetch(`${ZOHO_TOKEN_URL}?${params.toString()}`, {
    method: 'POST',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Zoho token request failed (${res.status}): ${text}`)
  }

  const json: any = await res.json()
  const accessToken: string | undefined = json.access_token
  const expiresIn: number = typeof json.expires_in === 'number' ? json.expires_in : 3600

  if (!accessToken) {
    throw new Error('Zoho token response did not include access_token')
  }

  cachedAccessToken = accessToken
  cachedExpiry = now + expiresIn * 1000

  return accessToken
}

interface CreateZohoSubscriptionBody {
  memberId?: string
  locationId?: string
  planId?: string
  startDate?: string
  endDate?: string
  subscriptionStatus?: string
  setupFee?: number
  paymentMode?: string
  autoRenew?: boolean
  cardId?: string
  freezeDaysQuota?: number
  paymentReference?: string
  paymentGatewayFee?: number
  couponId?: string
  couponDiscount?: string | number
}

export async function POST(request: Request) {
  try {
    const body: CreateZohoSubscriptionBody = await request.json().catch(() => ({} as CreateZohoSubscriptionBody))
    const {
      memberId,
      planId,
      startDate,
      endDate,
      subscriptionStatus,
      setupFee,
      paymentMode,
      autoRenew,
      freezeDaysQuota,
      paymentReference,
      paymentGatewayFee,
      couponId,
      couponDiscount,
      locationId,
    } = body

    if (!memberId || !planId || !startDate || !endDate || !paymentReference) {
      return NextResponse.json(
        { error: 'memberId, planId, startDate, endDate and paymentReference are required' },
        { status: 400 },
      )
    }

    const record: Record<string, any> = {
      Member_Name: { id: String(memberId) },
      Plan_Name: { id: String(planId) },
      Start_Date: startDate,
      End_Date: endDate,
      Subscription_Status: subscriptionStatus ?? 'live',
      Subscription_Mode: 'Online',
      Payment_Mode: paymentMode ?? 'Stripe',
      Payment_Reference: paymentReference,
      Location: locationId,
    }

    if (typeof setupFee === 'number') record.Setup_Fee = setupFee
    if (typeof autoRenew === 'boolean') record.Auto_Renew = autoRenew
    if (typeof freezeDaysQuota === 'number') record.Freeze_Days_Quota = freezeDaysQuota
    if (typeof paymentGatewayFee === 'number') record.Payment_Gateway_Fee = paymentGatewayFee
    if (couponId) record.Coupon_Code = couponId
    if (couponDiscount != null) record.Discount = couponDiscount

    const accessToken = await getZohoAccessToken()

    const res = await fetch(ZOHO_SUBSCRIPTIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ data: [record] }),
    })

    const json: any = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'Failed to create subscription in Zoho',
          status: res.status,
          details: json,
        },
        { status: 502 },
      )
    }

    const first = Array.isArray(json?.data) ? json.data[0] : undefined
    if (first && first.status === 'error') {
      return NextResponse.json(
        { error: 'Zoho returned an error for subscription create', details: first },
        { status: 502 },
      )
    }

    return NextResponse.json({ data: first ?? null })
  } catch (err) {
    console.error('Zoho subscriptions error', err)
    return NextResponse.json(
      { error: 'Zoho subscriptions integration error', message: (err as Error).message },
      { status: 500 },
    )
  }
}
