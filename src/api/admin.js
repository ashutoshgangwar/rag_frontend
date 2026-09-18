/**
 * The admin endpoints. Every one needs the token and role === 'admin'; the
 * backend answers 403 to anyone else, and the UI hides these routes for them.
 *
 *   GET   /api/admin/plans            → { plans }   (inactive ones included)
 *   POST  /api/admin/plans            → 201 { plan }
 *   PATCH /api/admin/plans/:planId    → { plan }    (no delete: { active: false } retires a plan)
 *   GET   /api/admin/settings         → { settings: { freePromptLimit } }
 *   PATCH /api/admin/settings         → { settings }
 *
 * The validation rules are mirrored here so an obvious mistake is caught
 * before a round trip. The server re-validates, and its `error` is still
 * shown on a 400 or 409.
 */

import { request } from './http.js'
import { toPlan, toPlans } from './subscriptions.js'

export const PLAN_INTERVALS = ['day', 'month', 'year']
export const PLAN_LIMITS = {
  idMin: 2,
  idMax: 40,
  name: 60,
  description: 300,
  countMin: 1,
  countMax: 36,
}

const ID_RE = /^[a-z0-9-]+$/
const CURRENCY_RE = /^[A-Za-z]{3}$/

export function isAdmin(user) {
  return user?.role === 'admin'
}

/* ------------------------------------------------------------------ *
 * Calls
 * ------------------------------------------------------------------ */

export async function fetchAdminPlans({ signal } = {}) {
  const body = await request('/api/admin/plans', { signal })
  return toPlans(body.plans)
}

export async function createPlan(input, { signal } = {}) {
  const body = await request('/api/admin/plans', { method: 'POST', json: input, signal })
  return toPlan(body.plan)
}

export async function updatePlan(planId, changes, { signal } = {}) {
  const body = await request(`/api/admin/plans/${encodeURIComponent(planId)}`, {
    method: 'PATCH',
    json: changes,
    signal,
  })
  return toPlan(body.plan)
}

function toSettings(body) {
  const limit = Number(body?.settings?.freePromptLimit)
  return { freePromptLimit: Number.isFinite(limit) ? limit : null }
}

export async function fetchAdminSettings({ signal } = {}) {
  return toSettings(await request('/api/admin/settings', { signal }))
}

export async function updateAdminSettings(settings, { signal } = {}) {
  return toSettings(await request('/api/admin/settings', { method: 'PATCH', json: settings, signal }))
}

/* ------------------------------------------------------------------ *
 * Form ⇄ body
 * ------------------------------------------------------------------ */

/** What the plan form starts with: blank for a new plan, the plan's values for an edit. */
export function planFormValues(plan) {
  return {
    id: plan?.id ?? '',
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    amount: plan ? String(plan.amount) : '',
    currency: plan?.currency ?? 'INR',
    interval: plan?.interval ?? 'month',
    intervalCount: plan ? String(plan.intervalCount) : '1',
    order: Number.isFinite(plan?.order) ? String(plan.order) : '',
    active: plan ? plan.active : true,
  }
}

const isInteger = (text) => /^-?\d+$/.test(text)

/**
 * Checks the form and builds the request body.
 *   creating → the full POST body
 *   editing  → only the fields that changed, for the PATCH
 * Returns { fields, body }: `fields` holds one message per invalid field, and
 * `body` is only meaningful when `fields` is empty.
 */
export function validatePlanForm(values, { original = null } = {}) {
  const creating = !original
  const fields = {}
  const id = values.id.trim()
  const name = values.name.trim()
  const description = values.description.trim()
  const amountText = String(values.amount).trim()
  const currency = values.currency.trim().toUpperCase()
  const countText = String(values.intervalCount).trim()
  const orderText = String(values.order).trim()

  if (creating) {
    if (!id) fields.id = 'Enter an id.'
    else if (id.length < PLAN_LIMITS.idMin || id.length > PLAN_LIMITS.idMax)
      fields.id = `Use ${PLAN_LIMITS.idMin}–${PLAN_LIMITS.idMax} characters.`
    else if (!ID_RE.test(id)) fields.id = 'Use lowercase letters, digits and dashes only.'
  }

  if (!name) fields.name = 'Enter a name.'
  else if (name.length > PLAN_LIMITS.name) fields.name = `Keep it under ${PLAN_LIMITS.name} characters.`

  if (description.length > PLAN_LIMITS.description)
    fields.description = `Keep it under ${PLAN_LIMITS.description} characters.`

  const amount = Number(amountText)
  if (!amountText) fields.amount = 'Enter a price.'
  else if (!Number.isFinite(amount) || amount < 0) fields.amount = 'Enter a number of 0 or more.'

  if (!CURRENCY_RE.test(currency)) fields.currency = 'Use a 3-letter code, e.g. INR.'

  if (!PLAN_INTERVALS.includes(values.interval)) fields.interval = 'Choose day, month or year.'

  const intervalCount = Number(countText)
  if (!isInteger(countText) || intervalCount < PLAN_LIMITS.countMin || intervalCount > PLAN_LIMITS.countMax)
    fields.intervalCount = `Enter a whole number from ${PLAN_LIMITS.countMin} to ${PLAN_LIMITS.countMax}.`

  const order = orderText === '' ? null : Number(orderText)
  if (orderText !== '' && !isInteger(orderText)) fields.order = 'Enter a whole number.'

  // Stored to two decimal places by the server; rounding here keeps the
  // "changed?" comparison below honest.
  const full = {
    name,
    description,
    amount: Math.round(amount * 100) / 100,
    currency,
    interval: values.interval,
    intervalCount,
  }

  if (creating) {
    const body = { id, ...full }
    if (order !== null) body.order = order
    return { fields, body }
  }

  const body = {}
  for (const [key, value] of Object.entries(full)) {
    if (value !== original[key]) body[key] = value
  }
  if (order !== null && order !== original.order) body.order = order
  if (values.active !== original.active) body.active = values.active
  return { fields, body }
}

export function validateFreePromptLimit(text) {
  const value = String(text).trim()
  if (!value) return 'Enter a number.'
  if (!/^\d+$/.test(value)) return 'Enter a whole number of 0 or more.'
  return null
}
