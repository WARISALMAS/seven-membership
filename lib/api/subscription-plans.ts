import { useQuery } from '@tanstack/react-query'
import type { Membership, SubscriptionPlanItem } from './types'

export interface SubscriptionPlansParams {
  brand?: string;
  location?: string;
  gender?: string;
  page?: number;
  limit?: number;
}

function buildQueryString(params: SubscriptionPlansParams): string {
  const search = new URLSearchParams()
  if (params.brand != null && params.brand !== '') search.set('brand', params.brand)
  if (params.location != null && params.location !== '') search.set('location', params.location)
  if (params.gender != null && params.gender !== '') search.set('gender', params.gender)
  if (params.page != null) search.set('page', String(params.page))
  if (params.limit != null) search.set('limit', String(params.limit))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/** Map Zoho plan to Membership for UI cards. Uses App_Display_Name when available. */
function mapPlanToMembership(item: SubscriptionPlanItem): Membership {
  const id = item.id != null ? String(item.id) : ''
  const rawName = (item as any).App_Display_Name ?? item.Name ?? 'Plan'
  const name = String(rawName)
  const price = typeof item.Price === 'number' ? item.Price : 0
  const currency = item.Currency ?? 'AED'

  // Use Plan_Category field: "Passes" → Pass tab, "Annual" → Annual tab
  const planCategory = String(item.Plan_Category ?? '').toLowerCase()
  const duration = planCategory === 'passes' ? 'Pass' : 'Annual'

  const description = item.Plan_Description ?? ''
  const tax_percentage = typeof item.Tax_Percentage === 'number' ? item.Tax_Percentage : 0
  const number_of_days = typeof item.Number_of_Days === 'number' ? item.Number_of_Days : 0
  const benefits = description
    ? description
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  return { id, name, benefits, duration, price, currency, tax_percentage, number_of_days }
}

export interface SubscriptionPlansResult {
  plans: Membership[]
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}

export async function fetchSubscriptionPlans(
  params: SubscriptionPlansParams,
): Promise<SubscriptionPlansResult> {
  const res = await fetch(`/api/zoho/subscription-plans${buildQueryString(params)}`, {
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error('Unable to load subscription plans')
  }
  const json: { data?: SubscriptionPlanItem[] } = await res.json()
  const list = json?.data ?? []

  // Only keep plans that are Active and have a positive price.
  // Whatever other filters match (gender, etc), if Status is Inactive we never show it.
  const activeAndPriced = Array.isArray(list)
    ? list.filter((item) => {
        const status = String(item.Status ?? '').toLowerCase()
        if (status !== 'active') return false
        const price = typeof item.Price === 'number' ? item.Price : 0
        return price > 0
      })
    : []

  // Optional gender filtering on top of backend filtering.
  // If a gender is provided, keep plans whose Gender array includes that value.
  const genderParam = params.gender
  const filtered = genderParam
    ? activeAndPriced.filter((item) => {
        const genders = Array.isArray(item.Gender) ? item.Gender : []
        if (!genders.length) {
          // No gender specified on plan – treat as available to everyone.
          return true
        }
        const normalized = genders.map((g) => String(g).toLowerCase())
        const target = String(genderParam).toLowerCase()
        return normalized.includes(target)
      })
    : activeAndPriced

  // Map to Membership and sort from cheapest to highest price
  const plans = filtered
    .map(mapPlanToMembership)
    .sort((a, b) => a.price - b.price)
  const pagination = {
    page: params.page ?? 1,
    limit: params.limit ?? 5,
    total: plans.length,
    totalPages: 1,
  }
  return { plans, pagination }
}

export const subscriptionPlansKeys = {
  all: ['subscription-plans'] as const,
  list: (params: SubscriptionPlansParams) => [...subscriptionPlansKeys.all, params] as const,
}

export function useSubscriptionPlans(params: SubscriptionPlansParams, options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false
  return useQuery({
    queryKey: subscriptionPlansKeys.list(params),
    queryFn: () => fetchSubscriptionPlans(params),
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}
