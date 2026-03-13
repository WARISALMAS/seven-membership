import { NextResponse } from 'next/server'

const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token'
const ZOHO_CONTACTS_URL = 'https://www.zohoapis.com/crm/v8/Contacts'

let cachedAccessToken: string | null = null
let cachedExpiry: number = 0

async function getZohoAccessToken(): Promise<string> {
  const now = Date.now()

  if (cachedAccessToken && cachedExpiry > now + 5000) {
    return cachedAccessToken
  }

  const clientId = process.env.ZOHO_CLIENT_ID
  const clientSecret = process.env.ZOHO_CLIENT_SECRET
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN

  const params = new URLSearchParams({
    client_id: clientId!,
    client_secret: clientSecret!,
    grant_type: 'refresh_token',
    refresh_token: refreshToken!,
  })

  const res = await fetch(`${ZOHO_TOKEN_URL}?${params.toString()}`, {
    method: 'POST',
  })

  const json: any = await res.json()

  cachedAccessToken = json.access_token
  cachedExpiry = now + (json.expires_in || 3600) * 1000

  return cachedAccessToken!
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { id, otp } = body

    if (!id || !otp) {
      return NextResponse.json(
        { error: 'id and last_sent_otp are required' },
        { status: 400 },
      )
    }

    const accessToken = await getZohoAccessToken()

    const res = await fetch(ZOHO_CONTACTS_URL, {
      method: 'PATCH',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [
          {
            "id":id,
            "OtpLogin": otp,
          },
        ],
        trigger: ['workflow'],
      }),
    })

    const json = await res.json()

    return NextResponse.json(json)
  } catch (err) {
    console.error('Zoho update error', err)

    return NextResponse.json(
      { error: 'Zoho update failed', message: (err as Error).message },
      { status: 500 },
    )
  }
}