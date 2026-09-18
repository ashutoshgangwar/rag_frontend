import { useCallback, useEffect, useRef } from 'react'
import PlanPicker from './PlanPicker.jsx'
import { fetchPlans } from '../../api/subscriptions.js'
import { useResource } from '../../hooks/useResource.js'
import { useSubscription } from '../../subscription/SubscriptionContext.js'

const DEFAULT_MESSAGE = 'Choose a plan to keep using chat and AI agents.'

/**
 * Opened by a 402 on any metered call (or by an "Upgrade" button), closed by
 * a purchase — purchasePlan() does that — or by the user.
 *
 * A 402 already carries the plans, so the modal only fetches them when it was
 * opened by hand.
 *
 * Escape is heard on `window`, not `document`: the purchase confirmation opens
 * on top of this, and its own Escape handler stops the event at `document`,
 * so one keypress closes only the dialog on top.
 */
function PaywallDialog({ paywall, locked, onClose }) {
  const suppliedPlans = paywall.plans?.length ? paywall.plans : null
  const fetched = useResource(fetchPlans, { enabled: !suppliedPlans })
  const closeRef = useRef(null)
  const restoreFocusRef = useRef(null)
  const lockedRef = useRef(locked)

  useEffect(() => {
    lockedRef.current = locked
  })

  // Mid-purchase the modal stays: closing it would hide the outcome.
  const close = useCallback(() => {
    if (!lockedRef.current) onClose()
  }, [onClose])

  useEffect(() => {
    restoreFocusRef.current = document.activeElement
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      // Back to the input the user was typing in, message intact.
      if (restoreFocusRef.current instanceof HTMLElement) restoreFocusRef.current.focus()
    }
  }, [close])

  const plans = suppliedPlans ?? fetched.data?.plans ?? null

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="dialog paywall-dialog" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
        <div className="paywall-head">
          <div>
            <h2 id="paywall-title">Upgrade to keep going</h2>
            <p className="paywall-message">{paywall.message || DEFAULT_MESSAGE}</p>
          </div>
          <button type="button" className="btn btn-small" ref={closeRef} onClick={close} disabled={locked}>
            Not now
          </button>
        </div>

        {paywall.message && (
          <p className="paywall-note muted">
            Your message is still in the box. Send it again once you have subscribed.
          </p>
        )}

        <PlanPicker
          plans={plans}
          loading={!suppliedPlans && fetched.loading}
          error={suppliedPlans ? null : fetched.error}
          onRetry={fetched.reload}
        />
      </div>
    </div>
  )
}

export default function PaywallModal() {
  const { paywall, closePaywall, purchasing } = useSubscription()
  if (!paywall) return null
  return <PaywallDialog paywall={paywall} locked={Boolean(purchasing)} onClose={closePaywall} />
}
