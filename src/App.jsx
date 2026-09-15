import { useAuth } from './auth/AuthContext.js'
import AuthScreen from './components/auth/AuthScreen.jsx'
import BrandMark from './components/BrandMark.jsx'
import Workspace from './components/Workspace.jsx'

/**
 * The gate. Which of the two surfaces the app is showing is decided here and
 * only here, so nothing below has to wonder whether there is a user.
 */
export default function App() {
  const { status } = useAuth()

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

  return status === 'authenticated' ? <Workspace /> : <AuthScreen />
}
