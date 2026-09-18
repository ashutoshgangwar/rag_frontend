import { useCallback, useState } from 'react'
import ConfirmDialog from '../ConfirmDialog.jsx'
import { formatMoney, periodLabel } from '../../api/subscriptions.js'
import { useAuth } from '../../auth/AuthContext.js'
import { useSubscription } from '../../subscription/SubscriptionContext.js'
import { formatDate } from '../../utils/format.js'

function PlanCard({ plan, current, busy, disabled, onSubscribe }) {
  return (
    <li className={`plan-card ${current ? 'plan-card-current' : ''}`}>
      <div className="plan-card-head">
        <h3>{plan.name}</h3>
        {current && <span className="pill pill-ready">Current plan</span>}
      </div>
      <p className="plan-price">
        <strong>{formatMoney(plan.amount, plan.currency)}</strong>
        <span className="muted">{periodLabel(plan)}</span>
      </p>
      {plan.description && <p className="plan-description muted">{plan.description}</p>}
      <button
        type="button"
        className="btn btn-primary btn-block plan-cta"
        onClick={() => onSubscribe(plan)}
        disabled={disabled}
        aria-busy={busy || undefined}
      >
        {busy ? 'Subscribing…' : 'Subscribe'}
      </button>
    </li>
  )
}

/**
 * The plan cards and the whole buy flow behind them: confirm, purchase, and
 * any error. Shared by the pricing page and the paywall so the two can never
 * disagree about what Subscribe does.
 *
 * Signed out, Subscribe calls `onRequireSignIn(plan)` instead. `initialPlanId`
 * reopens the confirmation for a plan picked before signing in.
 */
export default function PlanPicker({ plans, loading, error, onRetry, onPurchased, onRequireSignIn, initialPlanId = null }) {
  const { status } = useAuth()
  const { subscribed, subscription, purchasePlan, purchasing } = useSubscription()
  const [confirming, setConfirming] = useState(null)
  const [purchaseError, setPurchaseError] = useState(null)
  const [pendingPlanId, setPendingPlanId] = useState(initialPlanId)
  const authenticated = status === 'authenticated'

  // Picked before sign-in: once the plans are here, go straight to confirming it.
  if (pendingPlanId && authenticated && plans?.length) {
    setPendingPlanId(null)
    const picked = plans.find((plan) => plan.id === pendingPlanId)
    if (picked) setConfirming(picked)
  }

  const choose = (plan) => {
    setPurchaseError(null)
    if (!authenticated) onRequireSignIn?.(plan)
    else setConfirming(plan)
  }

  const cancel = useCallback(() => {
    if (!purchasing) setConfirming(null)
  }, [purchasing])

  const confirm = async () => {
    if (!confirming) return
    try {
      const result = await purchasePlan(confirming.id)
      setConfirming(null)
      if (result) onPurchased?.(result, confirming)
    } catch (err) {
      setConfirming(null)
      setPurchaseError(err.message || 'The purchase did not go through. Please try again.')
    }
  }

  // Plans stack: a purchase made while subscribed starts when the current
  // period ends.
  const stacksOn = subscribed && subscription?.endsAt ? subscription.endsAt : null
  const confirmDescription = confirming
    ? `${confirming.name} is ${formatMoney(confirming.amount, confirming.currency)} ${periodLabel(confirming)}. ` +
      (stacksOn
        ? `Your new plan starts on ${formatDate(stacksOn)}, when your current plan ends.`
        : 'It starts straight away.')
    : ''

  return (
    <div className="plan-picker">
      {purchaseError && (
        <div className="notice notice-error" role="alert">
          <p className="notice-title">Subscription failed</p>
          <p>{purchaseError}</p>
        </div>
      )}

      {loading && (
        <ul className="plan-grid" aria-busy="true" aria-label="Loading plans">
          {[0, 1, 2].map((index) => (
            <li key={index} className="plan-card plan-card-skeleton" />
          ))}
        </ul>
      )}

      {!loading && error && (
        <div className="notice notice-error" role="alert">
          <p className="notice-title">Could not load plans</p>
          <p>{error}</p>
          {onRetry && (
            <div className="notice-actions">
              <button type="button" className="btn btn-small" onClick={onRetry}>
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && !error && plans?.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">No plans on sale right now</p>
          <p className="muted">Check back soon.</p>
        </div>
      )}

      {!loading && !error && plans?.length > 0 && (
        <ul className="plan-grid">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={subscribed && subscription?.planId === plan.id}
              busy={purchasing === plan.id}
              disabled={Boolean(purchasing)}
              onSubscribe={choose}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming ? `Subscribe to ${confirming.name}?` : ''}
        description={confirmDescription}
        confirmLabel="Subscribe"
        busy={Boolean(purchasing)}
        onConfirm={confirm}
        onCancel={cancel}
      />
    </div>
  )
}
