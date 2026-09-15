import { useState } from 'react'
import { documentDownloadUrl } from '../api/client.js'
import { formatPercent, similarityBand, similarityBarFraction } from '../utils/format.js'
import { pluralize } from '../utils/format.js'

const PREVIEW_LENGTH = 200

function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false)

  const content = source.content ?? ''
  const isLong = content.length > PREVIEW_LENGTH
  const shown = expanded || !isLong ? content : `${content.slice(0, PREVIEW_LENGTH).trimEnd()}…`

  const band = similarityBand(source.similarity)
  // pageNumber can legitimately be null when the parser produced no page
  // breakdown — show the filename alone rather than "page null".
  const hasPage = Number.isFinite(source.pageNumber)

  return (
    <li className="source-card">
      <div className="source-head">
        <span className="source-index" aria-hidden="true">
          {index + 1}
        </span>
        <div className="source-cite">
          {/* Opens the original PDF so the claim can be checked at the source. */}
          <a
            className="source-file"
            href={documentDownloadUrl(source.fileId)}
            target="_blank"
            rel="noreferrer"
            title="Open the original PDF"
          >
            {source.filename}
          </a>
          {hasPage && (
            <>
              <span className="source-sep" aria-hidden="true">
                ·
              </span>
              <span className="source-page">page {source.pageNumber}</span>
            </>
          )}
        </div>

        <div className={`similarity similarity-${band.key}`} title={`Cosine similarity ${formatPercent(source.similarity, 2)}`}>
          <span className="similarity-label">{band.label}</span>
          <span className="similarity-bar" aria-hidden="true">
            <span
              className="similarity-fill"
              style={{ width: `${similarityBarFraction(source.similarity) * 100}%` }}
            />
          </span>
          <span className="similarity-score">{source.similarity?.toFixed(3) ?? '—'}</span>
        </div>
      </div>

      {/* Raw text extracted from a user's PDF: rendered as text, never HTML. */}
      <p className="source-content">{shown}</p>

      {isLong && (
        <button
          type="button"
          className="btn btn-link btn-small"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : `Show more (${content.length} characters)`}
        </button>
      )}
    </li>
  )
}

/**
 * The exact chunks the model was given, best match first. This is what makes
 * an answer auditable, so it is deliberately verbatim and traceable back to a
 * file and a page.
 */
export default function SourceList({ sources }) {
  const [open, setOpen] = useState(false)
  if (!sources || sources.length === 0) return null

  return (
    <div className="sources">
      <button
        type="button"
        className="sources-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className={`caret ${open ? 'caret-open' : ''}`} aria-hidden="true">
          ▸
        </span>
        {sources.length} {pluralize(sources.length, 'source')}
        <span className="muted"> — the exact text the model was given</span>
      </button>

      {open && (
        <ol className="source-cards">
          {sources.map((source, index) => (
            <SourceCard key={source.id} source={source} index={index} />
          ))}
        </ol>
      )}
    </div>
  )
}
