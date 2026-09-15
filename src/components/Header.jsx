import BrandMark from './BrandMark.jsx'
import HealthBadge from './HealthBadge.jsx'
import UserMenu from './UserMenu.jsx'
import { formatNumber, pluralize } from '../utils/format.js'

export default function Header({ health, status, error, onRefresh, stats }) {
  const fileCount = stats?.files ?? 0
  const chunkCount = stats?.chunks ?? 0

  return (
    <header className="app-header">
      <div className="brand">
        <BrandMark />
        <div>
          <h1 className="gradient-text">Rangify Intelligence</h1>
          <p className="muted">Ask questions against your own PDFs — retrieval and all.</p>
        </div>
      </div>

      <div className="header-meta">
        <span className="chunk-pill" title="Everything currently indexed">
          {formatNumber(fileCount)} {pluralize(fileCount, 'document')} ·{' '}
          {formatNumber(chunkCount)} {pluralize(chunkCount, 'chunk')} indexed
        </span>
        <HealthBadge health={health} status={status} error={error} onRefresh={onRefresh} />
        <UserMenu />
      </div>
    </header>
  )
}
