import { useCallback, useEffect, useRef, useState } from 'react'
import ConfirmDialog from './ConfirmDialog.jsx'
import { documentDownloadUrl, isAbortError } from '../api/client.js'
import {
  formatAbsoluteTime,
  formatBytes,
  formatNumber,
  formatRelativeTime,
  pluralize,
} from '../utils/format.js'

const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
}

function StatusPill({ status }) {
  const key = STATUS_LABELS[status] ? status : 'pending'
  return <span className={`pill pill-${key}`}>{STATUS_LABELS[key] ?? status}</span>
}

/**
 * One uploaded PDF: its ingestion status, its actions, and its chunks —
 * which are fetched only when the row is actually expanded.
 */
export default function DocumentRow({ file, onLoadChunks, onDelete, onReupload, deleting }) {
  const [expanded, setExpanded] = useState(false)
  const [chunks, setChunks] = useState(null)
  const [chunkTotal, setChunkTotal] = useState(0)
  const [chunkLoading, setChunkLoading] = useState(false)
  const [chunkError, setChunkError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const fetchChunks = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setChunkLoading(true)
    setChunkError(null)
    try {
      const body = await onLoadChunks(file.id, { signal: controller.signal })
      setChunks(body.chunks || [])
      setChunkTotal(body.total ?? 0)
    } catch (err) {
      if (isAbortError(err)) return
      setChunkError(err.message)
    } finally {
      if (!controller.signal.aborted) setChunkLoading(false)
    }
  }, [file.id, onLoadChunks])

  const toggleExpanded = () => {
    const next = !expanded
    setExpanded(next)
    if (next && chunks === null) fetchChunks()
  }

  return (
    <li className={`doc-row ${file.status === 'failed' ? 'doc-row-failed' : ''}`}>
      <div className="doc-main">
        <div className="doc-title">
          <span className="doc-icon" aria-hidden="true">
            PDF
          </span>
          <span className="doc-name" title={file.filename}>
            {file.filename}
          </span>
          <StatusPill status={file.status} />
        </div>

        <div className="doc-meta muted">
          <span>{formatBytes(file.sizeBytes)}</span>
          {/* A document that never parsed has no page count to show. */}
          {Number.isFinite(file.pageCount) && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {formatNumber(file.pageCount)} {pluralize(file.pageCount, 'page')}
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>
            {formatNumber(file.chunkCount)} {pluralize(file.chunkCount, 'chunk')}
          </span>
          <span aria-hidden="true">·</span>
          <time dateTime={file.createdAt} title={formatAbsoluteTime(file.createdAt)}>
            {formatRelativeTime(file.createdAt)}
          </time>
        </div>

        {/* A broken document is surfaced with its reason, not hidden in the list. */}
        {file.status === 'failed' && file.error && (
          <p className="doc-error" role="alert">
            {file.error}{' '}
            <button type="button" className="btn btn-link btn-small" onClick={onReupload}>
              Re-upload
            </button>
          </p>
        )}
      </div>

      <div className="doc-actions">
        <button
          type="button"
          className="btn btn-small"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          disabled={file.chunkCount === 0}
          title={file.chunkCount === 0 ? 'This document has no indexed chunks' : undefined}
        >
          {expanded ? 'Hide chunks' : 'View chunks'}
        </button>

        {/* Raw PDF bytes: a plain link, never the JSON helper. */}
        <a
          className="btn btn-small"
          href={documentDownloadUrl(file.id)}
          target="_blank"
          rel="noreferrer"
        >
          Download
        </a>

        <button
          type="button"
          className="btn btn-small btn-danger"
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      {expanded && (
        <div className="chunk-panel">
          {chunkLoading && <p className="muted">Loading chunks…</p>}
          {chunkError && (
            <p className="notice notice-error" role="alert">
              {chunkError}
            </p>
          )}
          {!chunkLoading && !chunkError && chunks?.length === 0 && (
            <p className="muted">No chunks stored for this document.</p>
          )}
          {!chunkLoading && chunks?.length > 0 && (
            <>
              <p className="muted chunk-count">
                Showing {chunks.length} of {formatNumber(chunkTotal)}{' '}
                {pluralize(chunkTotal, 'chunk')} — 200-character previews, in document order.
              </p>
              <ol className="chunk-list">
                {chunks.map((chunk) => (
                  <li key={chunk.id} className="chunk-item">
                    <div className="chunk-head muted">
                      <span>#{chunk.chunkIndex}</span>
                      {Number.isFinite(chunk.pageNumber) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>page {chunk.pageNumber}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{formatNumber(chunk.length)} characters</span>
                    </div>
                    <p className="chunk-preview">{chunk.preview}</p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        destructive
        busy={deleting}
        title="Delete this document?"
        description={`"${file.filename}" and its ${formatNumber(file.chunkCount)} ${pluralize(
          file.chunkCount,
          'chunk',
        )} will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete document"
        onConfirm={async () => {
          try {
            await onDelete(file.id)
          } finally {
            setConfirmOpen(false)
          }
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  )
}
