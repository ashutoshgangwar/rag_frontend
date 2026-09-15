import { useEffect, useRef, useState } from 'react'
import { pluralize } from '../utils/format.js'

/**
 * Chooses which PDFs a question searches. Defaults to all, which is also what
 * an empty selection means to the backend — so "all" sends no `fileIds` at all.
 *
 * Only `ready` files are offered: a pending, processing or failed document has
 * no searchable chunks behind it.
 */
export default function FileScopePicker({ files, selectedIds, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  const readyFiles = files.filter((file) => file.status === 'ready')
  const allSelected = selectedIds.length === 0 || selectedIds.length === readyFiles.length

  useEffect(() => {
    if (!open) return undefined
    const onDocumentDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocumentDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocumentDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (readyFiles.length === 0) {
    return (
      <div className="scope-bar muted">
        <span>No indexed documents yet — upload a PDF to ask about it.</span>
      </div>
    )
  }

  const toggle = (id) => {
    // An empty selection means "all", so the first tick has to start from the
    // full set rather than from nothing.
    const base = selectedIds.length === 0 ? readyFiles.map((file) => file.id) : selectedIds
    const next = base.includes(id) ? base.filter((value) => value !== id) : [...base, id]
    onChange(next.length === readyFiles.length ? [] : next)
  }

  const selectedCount = allSelected ? readyFiles.length : selectedIds.length

  return (
    <div className="scope-bar" ref={wrapperRef}>
      <span className="scope-summary">
        {allSelected ? (
          <>
            Searching <strong>all {readyFiles.length}</strong>{' '}
            {pluralize(readyFiles.length, 'document')}
          </>
        ) : (
          <>
            Asking <strong>{selectedCount}</strong> of {readyFiles.length}{' '}
            {pluralize(readyFiles.length, 'document')}
          </>
        )}
      </span>

      <button
        type="button"
        className="btn btn-small"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        disabled={disabled}
      >
        Choose documents
      </button>

      {!allSelected && (
        <button type="button" className="btn btn-link btn-small" onClick={() => onChange([])}>
          Reset to all
        </button>
      )}

      {open && (
        <div className="scope-popover">
          <fieldset>
            <legend className="sr-only">Documents to search</legend>
            <label className="scope-option">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onChange([])}
                disabled={allSelected}
              />
              <span>All documents</span>
            </label>
            <hr />
            {readyFiles.map((file) => {
              const checked = allSelected || selectedIds.includes(file.id)
              return (
                <label className="scope-option" key={file.id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(file.id)}
                  />
                  <span className="scope-name" title={file.filename}>
                    {file.filename}
                  </span>
                  <span className="muted">
                    {file.chunkCount} {pluralize(file.chunkCount, 'chunk')}
                  </span>
                </label>
              )
            })}
          </fieldset>
        </div>
      )}
    </div>
  )
}
