import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog.jsx'
import DocumentRow from './DocumentRow.jsx'
import { formatNumber, pluralize } from '../utils/format.js'

/**
 * The knowledge base panel: what is indexed, one row per PDF, and the two
 * destructive actions.
 */
export default function DocumentList({
  files,
  total,
  stats,
  offset,
  pageSize,
  loading,
  error,
  busyId,
  clearing,
  onGoToPage,
  onLoadChunks,
  onDelete,
  onClearAll,
  onReupload,
  onRefresh,
}) {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  const page = Math.floor(offset / pageSize) + 1
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const fileCount = stats?.files ?? 0
  const chunkCount = stats?.chunks ?? 0

  return (
    <section className="panel" aria-label="Knowledge base">
      <div className="panel-head">
        <h2>Knowledge base</h2>
        <div className="panel-head-meta">
          <span className="muted" aria-live="polite">
            {formatNumber(fileCount)} {pluralize(fileCount, 'document')} ·{' '}
            {formatNumber(chunkCount)} {pluralize(chunkCount, 'chunk')} indexed
          </span>
          <button
            type="button"
            className="btn btn-small"
            onClick={onRefresh}
            disabled={loading}
            title="Reload the list and counters from the server"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}

      {loading && files.length === 0 && <p className="muted">Loading documents…</p>}

      {!loading && files.length === 0 && !error && (
        <div className="empty-state">
          <p className="empty-title">Nothing indexed yet</p>
          <p className="muted">
            Upload a PDF above and it will appear here with its page and chunk counts.
          </p>
        </div>
      )}

      {files.length > 0 && (
        <ul className="doc-list">
          {files.map((file) => (
            <DocumentRow
              key={file.id}
              file={file}
              deleting={busyId === file.id}
              onLoadChunks={onLoadChunks}
              onDelete={onDelete}
              onReupload={onReupload}
            />
          ))}
        </ul>
      )}

      {total > pageSize && (
        <nav className="pager" aria-label="Document pages">
          <button
            type="button"
            className="btn btn-small"
            onClick={() => onGoToPage(offset - pageSize)}
            disabled={offset === 0 || loading}
          >
            Previous
          </button>
          <span className="muted">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className="btn btn-small"
            onClick={() => onGoToPage(offset + pageSize)}
            disabled={offset + pageSize >= total || loading}
          >
            Next
          </button>
        </nav>
      )}

      {total > 0 && (
        <div className="panel-foot">
          <button
            type="button"
            className="btn btn-danger btn-small"
            onClick={() => setConfirmClearOpen(true)}
            disabled={clearing}
          >
            {clearing ? 'Clearing…' : 'Clear knowledge base'}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmClearOpen}
        destructive
        busy={clearing}
        requireText="DELETE"
        title="Delete every document?"
        description={`This permanently deletes all ${formatNumber(total)} ${pluralize(
          total,
          'document',
        )} and all ${formatNumber(chunkCount)} indexed ${pluralize(
          chunkCount,
          'chunk',
        )}, including the stored PDF files. This cannot be undone.`}
        confirmLabel="Delete everything"
        onConfirm={async () => {
          try {
            await onClearAll()
          } finally {
            setConfirmClearOpen(false)
          }
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </section>
  )
}
