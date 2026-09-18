import { createContext, useContext } from 'react'

/** Split from the provider for the same fast-refresh reason as AuthContext. */
export const SubscriptionContext = createContext(null)

export function useSubscription() {
  const value = useContext(SubscriptionContext)
  if (!value) {
    throw new Error('useSubscription must be used inside <SubscriptionProvider>.')
  }
  return value
}
