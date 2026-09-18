import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext.js'
import { getSession } from '../api/session.js'
import { onPaywall, onUsage } from '../api/meter.js'
import { fetchMySubscription, subscribeToPlan, toPlans } from '../api/subscriptions.js'
import { SubscriptionContext } from './SubscriptionContext.js'

/**
 * Owns what GET /api/subscriptions/me says about the signed-in user — the
 * source of truth for the quota counter, the plan badge and the paywall.
 *
 * It is fetched when a user signs in (or a stored session is confirmed on
 * load), after a purchase, and after any 402. Between those, each metered
 * success carries `usage`, which updates the counter without a request.
 * Signing out drops all of it.
 *
 * The paywall's open state lives here too: the HTTP layer announces a 402
 * through src/api/meter.js, and this is the one listener.
 */
export default function SubscriptionProvider({ children }) {
  const { user, status } = useAuth()
  const userId = status === 'authenticated' ? (user?.id ?? null) : null

  // Keyed by user, so a sign-out (or a different sign-in) resets it during
  // render rather than showing the previous account's quota for a frame.
  const [me, setMe] = useState({ userId, data: null, error: null })
  const [paywall, setPaywall] = useState(null) // { message, freePromptLimit, plans } | null
  if (me.userId !== userId) {
    setMe({ userId, data: null, error: null })
    setPaywall(null)
  }

  const [purchasing, setPurchasing] = useState(null) // planId in flight
  const latestRef = useRef(0)
  const purchasingRef = useRef(false)
  const dataRef = useRef(null)

  useEffect(() => {
    dataRef.current = me.data
  })

  /** Re-reads /me. Out-of-order answers lose to the newest request. */
  const refresh = useCallback(async () => {
    if (!getSession()) return null
    const ticket = ++latestRef.current
    try {
      const data = await fetchMySubscription()
      if (ticket !== latestRef.current) return null
      setMe((current) => ({ ...current, data, error: null }))
      return data
    } catch (err) {
      if (ticket !== latestRef.current) return null
      setMe((current) => ({ ...current, error: err.message || 'Could not load your plan.' }))
      return null
    }
  }, [])

  const retry = useCallback(() => {
    setMe((current) => ({ ...current, error: null }))
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!userId) return undefined
    refresh()
    // A request still in flight for this user must not land after sign-out.
    return () => {
      latestRef.current += 1
    }
  }, [userId, refresh])

  /**
   * Folds a metered response's `usage` into the counter. A change of kind —
   * subscribed now but not before, or a plan that has lapsed — needs the
   * details only /me has, so that case re-fetches instead.
   */
  const applyUsage = useCallback(
    (usage) => {
      if (!usage || typeof usage !== 'object') return
      const known = dataRef.current
      if (!known || Boolean(usage.subscribed) !== known.subscribed) {
        refresh()
        return
      }
      if (usage.subscribed) return
      const remaining = Number(usage.freePromptsRemaining)
      if (!Number.isFinite(remaining)) return
      setMe((current) => {
        if (!current.data) return current
        const spent = Math.max(0, (current.data.freePromptsRemaining ?? remaining) - remaining)
        return {
          ...current,
          data: {
            ...current.data,
            freePromptsRemaining: remaining,
            promptsUsed: current.data.promptsUsed + spent,
            canPrompt: remaining > 0,
          },
        }
      })
    },
    [refresh],
  )

  useEffect(() => onUsage(applyUsage), [applyUsage])

  useEffect(
    () =>
      onPaywall((info) => {
        setPaywall({ ...info, plans: info.plans ? toPlans(info.plans).filter((plan) => plan.active) : null })
        refresh()
      }),
    [refresh],
  )

  /** Opened by hand (an "Upgrade" button) rather than by a 402: no message, plans fetched by the modal. */
  const openPaywall = useCallback(() => setPaywall({ message: null, freePromptLimit: null, plans: null }), [])
  const closePaywall = useCallback(() => setPaywall(null), [])

  /**
   * The only way the UI buys a plan. Resolves to { message, subscription };
   * rejects with the ApiError for the caller to show. A second call while one
   * is in flight is refused, so a double click cannot buy twice.
   */
  const purchasePlan = useCallback(
    async (planId) => {
      if (purchasingRef.current) return null
      purchasingRef.current = true
      setPurchasing(planId)
      try {
        // TODO: payment gateway — open checkout (Razorpay or similar) here,
        // and only call subscribeToPlan once the payment has succeeded, passing
        // along whatever reference the backend needs to verify it. Until then
        // subscribing activates the plan immediately, with nothing charged.
        const result = await subscribeToPlan(planId)
        setPaywall(null)
        await refresh()
        return result
      } finally {
        purchasingRef.current = false
        setPurchasing(null)
      }
    },
    [refresh],
  )

  const value = useMemo(() => {
    const data = me.data
    return {
      data,
      error: me.error,
      loading: Boolean(userId) && !data && !me.error,
      subscribed: Boolean(data?.subscribed),
      subscription: data?.subscription ?? null,
      // Unknown counts as yes: a failed /me must never lock anyone out —
      // the server still has the final say with a 402.
      canPrompt: data ? data.canPrompt !== false : true,
      refresh,
      retry,
      applyUsage,
      purchasePlan,
      purchasing,
      paywall,
      openPaywall,
      closePaywall,
    }
  }, [me, userId, refresh, retry, applyUsage, purchasePlan, purchasing, paywall, openPaywall, closePaywall])

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}
