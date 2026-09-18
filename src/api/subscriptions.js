/**
 * The subscription endpoints.
 *
 *   GET  /api/subscriptions/plans      (public) → { freePromptLimit, plans }
 *   GET  /api/subscriptions/me                  → { subscribed, subscription, freePromptLimit, promptsUsed, freePromptsRemaining, canPrompt }
 *   POST /api/subscriptions/subscribe           → 201 { message, subscription }
 *   GET  /api/subscriptions/history             → { subscriptions } (newest first, max 100)
 *
 * Plans come back already sorted and are kept in that order. Money is in the
 * currency's major unit (499 means ₹499). Plan ids are never hardcoded:
 * admins add plans, and every label here is built from the plan's own fields.
 */

import { request } from './http.js'

/* ------------------------------------------------------------------ *
 * Adapters
 * ------------------------------------------------------------------ */

const finite = (value, fallback = null) =>
  value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : fallback

export function toPlan(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null
  const count = Number(raw.intervalCount)
  return {
    id: String(raw.id),
    name: raw.name || String(raw.id),
    description: typeof raw.description === 'string' ? raw.description : '',
    interval: raw.interval || 'month',
    intervalCount: Number.isInteger(count) && count > 0 ? count : 1,
    amount: finite(raw.amount, 0),
    currency: typeof raw.currency === 'string' && raw.currency ? raw.currency.toUpperCase() : 'INR',
    active: raw.active !== false,
    order: finite(raw.order),
  }
}

export function toPlans(list) {
  return Array.isArray(list) ? list.map(toPlan).filter(Boolean) : []
}

export function toSubscription(raw) {
  if (!raw || typeof raw !== 'object') return null
  const count = Number(raw.intervalCount)
  return {
    id: String(raw.id ?? raw._id ?? ''),
    planId: raw.planId ?? null,
    planName: raw.planName || raw.planId || 'Plan',
    interval: raw.interval || 'month',
    intervalCount: Number.isInteger(count) && count > 0 ? count : 1,
    amount: finite(raw.amount, 0),
    currency: typeof raw.currency === 'string' && raw.currency ? raw.currency.toUpperCase() : 'INR',
    status: raw.status || 'active',
    startsAt: raw.startsAt ?? null,
    endsAt: raw.endsAt ?? null,
    createdAt: raw.createdAt ?? null,
  }
}

function toMe(body) {
  const subscription = toSubscription(body.subscription)
  const subscribed = Boolean(body.subscribed)
  const remaining = finite(body.freePromptsRemaining)
  return {
    subscribed,
    subscription,
    freePromptLimit: finite(body.freePromptLimit),
    promptsUsed: finite(body.promptsUsed, 0),
    freePromptsRemaining: remaining,
    // The server's word when it gives one; otherwise what it would say.
    canPrompt: typeof body.canPrompt === 'boolean' ? body.canPrompt : subscribed || (remaining ?? 1) > 0,
  }
}

/* ------------------------------------------------------------------ *
 * Calls
 * ------------------------------------------------------------------ */

/**
 * Public. Sent without the token: a stale one on a logged-out pricing page
 * must not turn into a 401 and a "session expired" notice.
 */
export async function fetchPlans({ signal } = {}) {
  const body = await request('/api/subscriptions/plans', { auth: false, skipAuthRedirect: true, signal })
  return {
    freePromptLimit: finite(body.freePromptLimit),
    // The public list should hold only active plans; filtered anyway so a
    // backend slip never puts a retired plan on sale.
    plans: toPlans(body.plans).filter((plan) => plan.active),
  }
}

export async function fetchMySubscription({ signal } = {}) {
  return toMe(await request('/api/subscriptions/me', { signal }))
}

/**
 * Activates the plan straight away — there is no payment step yet. Call it
 * only through purchasePlan() in the subscription provider, which is where
 * the payment step will go.
 */
export async function subscribeToPlan(planId, { signal } = {}) {
  const body = await request('/api/subscriptions/subscribe', {
    method: 'POST',
    json: { planId },
    signal,
  })
  return { message: body.message || null, subscription: toSubscription(body.subscription) }
}

export async function fetchSubscriptionHistory({ signal } = {}) {
  const body = await request('/api/subscriptions/history', { signal })
  return Array.isArray(body.subscriptions) ? body.subscriptions.map(toSubscription).filter(Boolean) : []
}

/* ------------------------------------------------------------------ *
 * Display helpers
 * ------------------------------------------------------------------ */

const UNITS = {
  day: ['day', 'days'],
  week: ['week', 'weeks'],
  month: ['month', 'months'],
  year: ['year', 'years'],
}

function unitName(interval, count) {
  const [one, many] = UNITS[interval] ?? [interval, `${interval}s`]
  return count === 1 ? one : many
}

/** "per month", "every 3 months". */
export function periodLabel({ interval, intervalCount = 1 }) {
  return intervalCount === 1
    ? `per ${unitName(interval, 1)}`
    : `every ${intervalCount} ${unitName(interval, intervalCount)}`
}

/** "1 month", "3 months" — for the admin table. */
export function durationLabel({ interval, intervalCount = 1 }) {
  return `${intervalCount} ${unitName(interval, intervalCount)}`
}

/**
 * ₹499, ₹49.50. Whole amounts drop the decimals — "₹499.00" reads like an
 * invoice line, not a price.
 */
export function formatMoney(amount, currency = 'INR') {
  if (!Number.isFinite(amount)) return '—'
  const whole = Number.isInteger(amount)
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : null),
    }).format(amount)
  } catch {
    // An admin typed a code Intl does not know. Still show something honest.
    return `${currency} ${amount}`
  }
}

/**
 * What a subscription row is, right now. A stacked plan is stored as active
 * but has not started, and saying "Active" about it would be wrong.
 */
export function subscriptionPhase(subscription, now = Date.now()) {
  const starts = Date.parse(subscription?.startsAt)
  if (Number.isFinite(starts) && starts > now) return 'upcoming'
  const ends = Date.parse(subscription?.endsAt)
  if (subscription?.status === 'active' && Number.isFinite(ends) && ends <= now) return 'expired'
  return subscription?.status || 'unknown'
}

export function phaseLabel(phase) {
  if (!phase) return 'Unknown'
  return phase.charAt(0).toUpperCase() + phase.slice(1)
}
