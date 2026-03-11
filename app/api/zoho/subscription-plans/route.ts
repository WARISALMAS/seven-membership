import { NextResponse } from 'next/server'

const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token'
const ZOHO_SUBSCRIPTION_PLANS_URL = 'https://www.zohoapis.com/crm/v8/Subscription_Plans'

let cachedAccessToken: string | null = null
let cachedExpiry: number = 0

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const brand = searchParams.get('brand') || undefined
    const location = searchParams.get('location') || undefined
    const gender = searchParams.get('gender') || undefined

    console.log('[Zoho][plans] Incoming request params', {
      brand,
      location,
      gender,
    })

    const accessToken = await getZohoAccessToken()

    // Only Location is supported by Zoho search; Brand/Gender are filtered server-side
    const baseUrl = location
      ? `${ZOHO_SUBSCRIPTION_PLANS_URL}/search`
      : ZOHO_SUBSCRIPTION_PLANS_URL

    const url = new URL(baseUrl)
    url.searchParams.set(
      'fields',
      'Number_of_Days, Tax_Percentage, Name,App_Display_Name,Status,ShowOnApp,Brand,Location,Gender,Plan_Category,Price,Setup_Fee,Currency,Plan_Description,Subscription_Frequency',
    )
    if (location) {
      url.searchParams.set('criteria', `Location:equals:${location}`)
    }

    console.log('[Zoho][plans] Fetching URL', url.toString())
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: 'Failed to fetch subscription plans from Zoho', details: text },
        { status: 502 },
      )
    }

    const json: any = await res.json()
    let data: any[] = Array.isArray(json?.data) ? json.data : []

    console.log('[Zoho][plans] Raw records count', {
      total: data.length,
    })

    const locLower = location?.toLowerCase()
    const genderLower = gender?.toLowerCase()

    // Apply ALL conditions together (AND):
    // - If location provided: Location must match
    // - Status must be Active
    // - ShowOnApp must be true
    // - Price must be > 0
    // - If gender provided: Gender must match (or plan is unisex)
    data = data.filter((item) => {
      // LOCATION
      if (locLower) {
        const loc = item.Location
        let nameLower = ''

        if (Array.isArray(loc) && loc.length > 0) {
          const first = loc[0] as any
          const name =
            typeof first === 'string'
              ? first
              : first && typeof first === 'object'
              ? String(first.name ?? '')
              : ''
          nameLower = name.toLowerCase()
        } else if (loc && typeof loc === 'object') {
          nameLower = String((loc as any).name ?? '').toLowerCase()
        } else if (typeof loc === 'string') {
          nameLower = loc.toLowerCase()
        } else {
          return false
        }

        if (nameLower !== locLower) return false
      }

      // STATUS & PRICE & ShowOnApp
      const status = String(item.Status ?? '').toLowerCase()
      if (status !== 'active') return false
      const showOnAppRaw = item.ShowOnApp
      const showOnApp =
        showOnAppRaw === true ||
        showOnAppRaw === 1 ||
        String(showOnAppRaw).toLowerCase() === 'true'
      if (!showOnApp) return false
      const price = typeof item.Price === 'number' ? item.Price : 0
      if (price <= 0) return false

      // GENDER
      if (genderLower) {
        const genders: string[] = Array.isArray(item.Gender)
          ? item.Gender
          : item.Gender
          ? [item.Gender]
          : []
        if (!genders.length) {
          // No gender restriction → available to everyone
          return true
        }
        const hasMatch = genders.some((g) => String(g).toLowerCase() === genderLower)
        if (!hasMatch) return false
      }

      return true
    })

    console.log('[Zoho][plans] Filtered records count', {
      location,
      gender,
      count: data.length,
      sample: data.slice(0, 3).map((p) => ({
        id: p.id,
        name: p.App_Display_Name ?? p.Name,
        status: p.Status,
        showOnApp: p.ShowOnApp,
        price: p.Price,
      })),
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Zoho subscription plans error', err)
    return NextResponse.json(
      { error: 'Zoho subscription plans integration error', message: (err as Error).message },
      { status: 500 },
    )
  }
}

