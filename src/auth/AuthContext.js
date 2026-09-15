import { createContext, useContext } from 'react'

/**
 * Split from the provider so that this file exports no components — which
 * keeps both halves eligible for fast refresh.
 */
export const AuthContext = createContext(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>.')
  }
  return value
}
