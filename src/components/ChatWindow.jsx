import { useEffect, useMemo, useRef, useState } from 'react'
import MessageBubble from './MessageBubble.jsx'
import FileScopePicker from './FileScopePicker.jsx'
import { DEFAULT_TOP_K, MAX_QUESTION_LENGTH, MAX_TOP_K, MIN_TOP_K } from '../api/client.js'
import { pluralize } from '../utils/format.js'
import { QuotaInline } from './billing/QuotaIndicator.jsx'
import { useSubscription } from '../subscription/SubscriptionContext.js'

export default function ChatWindow({
  messages,
  pending,
  files,
  onAsk,
  onCancel,
  onClear,
  onJumpToUpload,
  disabled,
}) {
  const { canPrompt } = useSubscription()
  const [question, setQuestion] = useState('')
  const [topK, setTopK] = useState(DEFAULT_TOP_K)
  // Empty means "all", which is exactly what the backend expects.
  const [scopeIds, setScopeIds] = useState([])
  const listRef = useRef(null)
  const inputRef = useRef(null)

  // Newest at the bottom: follow the tail as messages and the pending
  // indicator come and go.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, pending])

  useEffect(() => {
    if (!pending) inputRef.current?.focus()
  }, [pending])

  const readyFiles = useMemo(() => files.filter((file) => file.status === 'ready'), [files])

  // Ids that have since been deleted are dropped on the way out rather than
  // stored, so a stale selection cannot quietly narrow a search to nothing.
  const liveScopeIds = useMemo(
    () => scopeIds.filter((id) => readyFiles.some((file) => file.id === id)),
    [scopeIds, readyFiles],
  )

  const scopedCount = liveScopeIds.length === 0 ? readyFiles.length : liveScopeIds.length
  const isSubset = liveScopeIds.length > 0 && liveScopeIds.length < readyFiles.length
  const scopeLabel = isSubset
    ? `Asking ${scopedCount} of ${readyFiles.length} ${pluralize(readyFiles.length, 'document')}`
    : null

  const length = question.length
  const overLimit = length > MAX_QUESTION_LENGTH
  const canSend = question.trim().length > 0 && !overLimit && !pending && !disabled && canPrompt

  const submit = async () => {
    if (!canSend) return
    // The question moves into the thread while it is answered. If it was not
    // used up (the paywall opened), it comes back here to be resent —
    // unless the user has started typing something else meanwhile.
    const sent = question
    setQuestion('')
    const used = await onAsk(sent, { topK, fileIds: liveScopeIds, scope: scopeLabel })
    if (used === false) setQuestion((current) => current || sent)
  }

  const onKeyDown = (event) => {
    // Enter sends, Shift+Enter makes a newline.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <section className="panel chat-panel" aria-label="Chat">
      <div className="panel-head">
        <h2>Chat</h2>
        {messages.length > 0 && (
          <button type="button" className="btn btn-small" onClick={onClear}>
            Clear conversation
          </button>
        )}
      </div>

      <div className="message-list" ref={listRef} aria-live="polite" aria-busy={pending}>
        {messages.length === 0 && !pending && (
          <div className="empty-state">
            <p className="empty-title">No messages yet</p>
            <p className="muted">
              Ask a question about the PDFs you have uploaded. Every answer shows the exact chunks
              it was built from.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} onJumpToUpload={onJumpToUpload} />
        ))}

        {pending && (
          <div className="message message-assistant">
            <div className="bubble bubble-assistant thinking">
              <span className="typing" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>Retrieving chunks and generating an answer…</span>
            </div>
          </div>
        )}
      </div>

      <FileScopePicker
        files={files}
        selectedIds={liveScopeIds}
        onChange={setScopeIds}
        disabled={pending || disabled}
      />

      <form
        className={`composer ${isSubset ? 'composer-scoped' : ''}`}
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        {isSubset && (
          <p className="composer-scope-note">
            {scopeLabel} — an answer may be missing anything in the documents you excluded.
          </p>
        )}

        <div className="composer-row">
          <label className="sr-only" htmlFor="question">
            Your question
          </label>
          <textarea
            id="question"
            ref={inputRef}
            rows={2}
            value={question}
            placeholder={
              disabled ? 'Backend unreachable…' : 'Ask a question…  (Enter to send, Shift+Enter for a new line)'
            }
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={pending || disabled}
            aria-describedby="char-counter"
            aria-invalid={overLimit}
          />

          {pending ? (
            <button type="button" className="btn btn-danger" onClick={onCancel}>
              Cancel
            </button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={!canSend}>
              Send
            </button>
          )}
        </div>

        <div className="composer-foot">
          <div className="topk">
            <label htmlFor="topk">
              Chunks to retrieve: <strong>{topK}</strong>
            </label>
            <input
              id="topk"
              type="range"
              min={MIN_TOP_K}
              max={MAX_TOP_K}
              value={topK}
              onChange={(event) => setTopK(Number(event.target.value))}
              disabled={pending}
            />
          </div>

          <QuotaInline />

          <span
            id="char-counter"
            className={`char-counter ${overLimit ? 'over' : ''}`}
            aria-live="polite"
          >
            {length} / {MAX_QUESTION_LENGTH}
            {overLimit && ' — too long to send'}
          </span>
        </div>
      </form>
    </section>
  )
}
