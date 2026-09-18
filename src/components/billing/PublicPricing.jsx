import BrandMark from '../BrandMark.jsx'
import ThemeToggle from '../ThemeToggle.jsx'
import PricingPage from './PricingPage.jsx'
import { navigate } from '../../hooks/useRoute.js'

/** /pricing for a signed-out visitor: the same page, in a lighter shell. */
export default function PublicPricing() {
  return (
    <div className="app">
      <header className="app-header app-header-public">
        <div className="brand">
          <BrandMark />
          <div>
            <h1 className="gradient-text">Rangify Intelligence</h1>
            <p className="muted">Grounded answers and AI agents, on your own documents.</p>
          </div>
        </div>
        <div className="header-meta">
          <ThemeToggle className="header-theme" />
          <button type="button" className="btn btn-primary btn-small" onClick={() => navigate('/pricing', { signIn: true })}>
            Sign in
          </button>
        </div>
      </header>
      <main className="page-main">
        <PricingPage />
      </main>
    </div>
  )
}
