import SourceList from './SourceList.jsx'
import { formatDuration, pluralize } from '../utils/format.js'

/**
 * The backend sends two different `note` values and they mean opposite things:
 * an empty knowledge base is a setup problem, while "no chunk matched" means
 * the documents are fine and the question simply is not covered.
 */
const EMPTY_KB_NOTE = 'No documents have been uploaded yet.'

function AnswerNote({ note, justIndexed, onJumpToUpload }) {
  if (!note && !justIndexed) return null

  if (note === EMPTY_KB_NOTE) {
    return (
      <p className="answer-note">
        Nothing has been indexed yet, so there was nothing to search.{' '}
        <button type="button" className="btn btn-link" onClick={onJumpToUpload}>
          Upload a PDF to get started
        </button>
      </p>
    )
  }

  return (
    <p className="answer-note">
      {note && <>No indexed chunk was close enough to this question. Try rephrasing it, widening
        the document scope, or raising the number of chunks retrieved.</>}
      {justIndexed && (
        <>
          {' '}
          A document finished indexing moments ago and the vector index updates a beat later —
          asking again usually picks it up.
        </>
      )}
    </p>
  )
}

export default function MessageBubble({ message, onJumpToUpload }) {
  if (message.role === 'system') {
    return <div className="message message-system">{message.content}</div>
  }

  if (message.role === 'user') {
    return (
      <div className="message message-user">
        <div className="bubble bubble-user">
          {message.content}
          {message.scope && <div className="bubble-scope">{message.scope}</div>}
        </div>
      </div>
    )
  }

  if (message.error) {
    return (
      <div className="message message-assistant">
        <div className="bubble bubble-error">
          <strong>Something went wrong.</strong>
          <p>{message.error}</p>
        </div>
      </div>
    )
  }

  const sourceCount = message.sources?.length ?? 0

  return (
    <div className="message message-assistant">
      <div className="bubble bubble-assistant">
        <p className="answer">{message.content}</p>

        <AnswerNote
          note={message.note}
          justIndexed={message.justIndexed}
          onJumpToUpload={onJumpToUpload}
        />

        <div className="answer-meta muted">
          <span>{formatDuration(message.tookMs)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {sourceCount} {pluralize(sourceCount, 'source')} used
          </span>
          {message.topK != null && (
            <>
              <span aria-hidden="true">·</span>
              <span>topK {message.topK}</span>
            </>
          )}
        </div>

        <SourceList sources={message.sources} />
      </div>
    </div>
  )
}
