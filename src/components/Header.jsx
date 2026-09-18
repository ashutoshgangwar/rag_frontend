import BrandMark from './BrandMark.jsx'
import HealthBadge from './HealthBadge.jsx'
import UserMenu from './UserMenu.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import AgentIcon from './agents/AgentIcon.jsx'
import { QuotaBadge } from './billing/QuotaIndicator.jsx'
import { formatNumber, pluralize } from '../utils/format.js'

const VIEWS = [
  { id: 'agents', label: 'AI Agents', icon: 'spark' },
  { id: 'documents', label: 'Documents', icon: 'doc' },
]

const SUBTITLES = {
  agents: 'AI agents that answer, explain, draft and plan for you.',
  documents: 'Ask questions against your own PDFs — retrieval and all.',
  pricing: 'Plans for unlimited chat and AI agents.',
  account: 'Your account and billing.',
  admin: 'Plans, pricing and limits.',
}

export default function Header({ health, status, error, onRefresh, stats, view, onViewChange }) {
  const fileCount = stats?.files ?? 0
  const chunkCount = stats?.chunks ?? 0

  return (
    <header className="app-header">
      <div className="brand">
        <BrandMark />
        <div>
          <h1 className="gradient-text">Rangify Intelligence</h1>
          <p className="muted">{SUBTITLES[view] ?? SUBTITLES.documents}</p>
        </div>
      </div>

      <nav className="view-switch" aria-label="Workspace">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`view-tab ${view === item.id ? 'view-tab-active' : ''}`}
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => onViewChange(item.id)}
          >
            <AgentIcon name={item.icon} size={15} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="header-meta">
        {view === 'documents' && (
          <span className="chunk-pill" title="Everything currently indexed">
            {formatNumber(fileCount)} {pluralize(fileCount, 'document')} ·{' '}
            {formatNumber(chunkCount)} {pluralize(chunkCount, 'chunk')} indexed
          </span>
        )}
        <QuotaBadge />
        <HealthBadge health={health} status={status} error={error} onRefresh={onRefresh} />
        <ThemeToggle className="header-theme" />
        <UserMenu />
      </div>
    </header>
  )
}
