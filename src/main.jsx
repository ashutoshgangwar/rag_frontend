import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import StartupError from './components/StartupError.jsx'

const root = createRoot(document.getElementById('root'))

/**
 * A missing VITE_API_BASE_URL throws while src/api/http.js evaluates — before
 * any component exists. With a static import that happens before this file's
 * first statement runs, so the page stays blank and the message reaches only
 * the console. Importing the app dynamically puts the failure somewhere it can
 * be caught and rendered.
 */
Promise.all([
  import('./App.jsx'),
  import('./auth/AuthProvider.jsx'),
  import('./subscription/SubscriptionProvider.jsx'),
])
  .then(([{ default: App }, { default: AuthProvider }, { default: SubscriptionProvider }]) => {
    root.render(
      <StrictMode>
        <AuthProvider>
          <SubscriptionProvider>
            <App />
          </SubscriptionProvider>
        </AuthProvider>
      </StrictMode>,
    )
  })
  .catch((error) => {
    console.error(error)
    root.render(<StartupError error={error} />)
  })
