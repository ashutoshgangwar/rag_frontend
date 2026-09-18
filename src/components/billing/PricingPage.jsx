import { useEffect, useState } from 'react'
import PlanPicker from './PlanPicker.jsx'
import { fetchPlans } from '../../api/subscriptions.js'
import { useAuth } from '../../auth/AuthContext.js'
import { useResource } from '../../hooks/useResource.js'
import { navigate, useRoute } from '../../hooks/useRoute.js'
import { useSubscription } from '../../subscription/SubscriptionContext.js'
import { planBadgeText, quotaText } from '../../subscription/quota.js'
import { pluralize } from '../../utils/format.js'

/**
 * /pricing — every active plan, in the order the API returns them. Open to
 * signed-out visitors too; for them Subscribe goes to sign-in first and
 * comes back here with the chosen plan remembered.
 *
 * Fetched fresh on every visit, so a plan an admin just added or retired is
 * reflected immediately.
 */
export default function PricingPage() {
  const { status } = useAuth()
  const { data: me } = useSubscription()
  const { path, state } = useRoute()
  const plans = useResource(fetchPlans)
  const [purchased, setPurchased] = useState(null)
  // Captured once: the plan picked before sign-in, if that is how we got here.
  const [resumePlanId] = useState(() => (typeof state?.planId === 'string' ? state.planId : null))
  const authenticated = status === 'authenticated'

  // One-shot state: drop it from history so Back does not reopen the confirmation.
  useEffect(() => {
    if (authenticated && state?.planId) navigate(path, null, { replace: true })
  }, [authenticated, path, state])

  const limit = plans.data?.freePromptLimit ?? me?.freePromptLimit

  return (
    <div className="page pricing-page">
      <header className="page-head">
        <h2 className="page-title">
          Plans <span className="gradient-text">&amp; pricing</span>
        </h2>
        <p className="muted">
          {Number.isFinite(limit)
            ? `Every account starts with ${limit} free ${pluralize(limit, 'prompt')} across chat and AI agents. After that, pick a plan.`
            : 'Pick a plan to keep using chat and AI agents.'}
        </p>
        {authenticated && me && (
          <p className="pricing-status">
            {me.subscribed ? `You're on ${planBadgeText(me.subscription)}.` : `You have ${quotaText(me)}.`}{' '}
            <button type="button" className="btn-link" onClick={() => navigate('/account')}>
              View billing
            </button>
          </p>
        )}
      </header>

      {purchased && (
        <div className="notice notice-success" role="status">
          <p className="notice-title">You're subscribed to {purchased.planName}</p>
          {purchased.message && <p>{purchased.message}</p>}
          <div className="notice-actions">
            <button type="button" className="btn btn-small" onClick={() => navigate('/agents')}>
              Back to work
            </button>
          </div>
        </div>
      )}

      <PlanPicker
        plans={plans.data?.plans ?? null}
        loading={plans.loading}
        error={plans.error}
        onRetry={plans.reload}
        initialPlanId={resumePlanId}
        onPurchased={(result, plan) => setPurchased({ planName: plan.name, message: result.message })}
        onRequireSignIn={(plan) => navigate('/pricing', { signIn: true, planId: plan.id })}
      />

      <p className="pricing-foot muted">
        Buying while a plan is active queues the new one to start when the current one ends.
      </p>
    </div>
  )
}
