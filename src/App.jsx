import { useAuth } from './auth/AuthContext.js'
import AuthScreen from './components/auth/AuthScreen.jsx'
import BrandMark from './components/BrandMark.jsx'
import Workspace from './components/Workspace.jsx'
import PublicPricing from './components/billing/PublicPricing.jsx'
import { matchPageRoute, useRoute } from './hooks/useRoute.js'

/**
 * The gate. Which surface the app is showing is decided here and only here,
 * so nothing below has to wonder whether there is a user.
 *
 * /pricing is the one page a signed-out visitor can see. Choosing a plan
 * there (or "Sign in") keeps the path and adds { signIn: true } to history
 * state, so signing in lands back on /pricing — and Back returns to the plans.
 */
export default function App() {
  const { status } = useAuth()
  const { path, state } = useRoute()

  // A stored token is being checked. Showing the sign-in form first would
  // make an already-signed-in user watch it vanish a moment later.
  if (status === 'restoring') {
    return (
      <div className="boot-screen" role="status">
        <BrandMark size={36} />
        <p className="muted">Restoring your session…</p>
      </div>
    )
  }

  if (status === 'authenticated') return <Workspace />
  if (matchPageRoute(path) === 'pricing' && !state?.signIn) return <PublicPricing />
  return <AuthScreen />
}
