import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import {
  isAbortError,
  isNotAResumeError,
  notAResumeReason,
  uploadDocument,
  validatePdfFile,
} from '../api/client.js'
import { formatBytes, formatNumber, pluralize } from '../utils/format.js'

/**
 * phase: 'idle' | 'uploading' | 'indexing' | 'done' | 'error'
 *
 * 'uploading' tracks bytes on the wire. The moment that hits 100% we switch to
 * 'indexing', because the server is still extracting, chunking and embedding —
 * bytes delivered is not work finished.
 */
const UploadPanel = forwardRef(function UploadPanel({ onUploaded }, ref) {
  const [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const inputRef = useRef(null)
  const sectionRef = useRef(null)
  const abortRef = useRef(null)

  const busy = phase === 'uploading' || phase === 'indexing'

  // Lets the rest of the app send the user here — from an empty-knowledge-base
  // answer, or from the "Re-upload" action on a failed document.
  useImperativeHandle(ref, () => ({
    focus() {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      inputRef.current?.focus()
    },
    browse() {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      inputRef.current?.click()
    },
    /**
     * The receipt describes a document that is now indexed, so it has to go
     * when that document is deleted — otherwise it sits there claiming page
     * and chunk counts for a file the knowledge base no longer has.
     * Called with an id after a single delete, with nothing after a clear-all.
     * This handle is rebuilt every render, so `result` here is current.
     */
    dismissResult(fileId) {
      if (!result) return
      if (fileId && result.fileId !== fileId) return
      setResult(null)
      setPhase('idle')
    },
  }))

  const startUpload = useCallback(
    async (file) => {
      setResult(null)
      setError(null)

      // Catch the obvious problems before spending a round trip.
      const validationError = validatePdfFile(file)
      if (validationError) {
        setFileName(file?.name || '')
        setFileSize(file?.size ?? 0)
        setError(validationError)
        setPhase('error')
        if (inputRef.current) inputRef.current.value = ''
        return
      }

      setFileName(file.name)
      setFileSize(file.size)
      setProgress(0)
      setPhase('uploading')

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const body = await uploadDocument(file, {
          signal: controller.signal,
          onProgress: (fraction) => {
            setProgress(fraction)
            if (fraction >= 1) setPhase('indexing')
          },
        })
        setResult(body)
        setPhase('done')
        onUploaded?.(body)
      } catch (err) {
        if (isAbortError(err)) {
          setPhase('idle')
          return
        }
        // The backend's error strings are already written for humans.
        setError(err.message)
        setPhase('error')
      } finally {
        abortRef.current = null
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [onUploaded],
  )

  const onDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    if (busy) return
    const file = event.dataTransfer.files?.[0]
    if (file) startUpload(file)
  }

  // Re-uploading identical bytes is not an error and not new work, so it gets
  // its own informational treatment rather than a success toast.
  const deduplicated = phase === 'done' && result?.deduplicated === true

  // "Not a resume" is the one failure the user fixes by picking a different
  // file rather than by retrying, so it gets guidance and a file picker
  // instead of the generic red error.
  const rejectedAsNotResume = phase === 'error' && isNotAResumeError(error)
  const rejectionReason = rejectedAsNotResume ? notAResumeReason(error) : null

  return (
    <section className="panel" aria-label="Upload a document" ref={sectionRef}>
      <div className="panel-head">
        <h2>Upload</h2>
        <span className="muted">Resume or CV — PDF, up to 20 MB</span>
      </div>

      <div
        className={`dropzone ${dragging ? 'dropzone-active' : ''} ${busy ? 'dropzone-busy' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          if (!busy) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p className="dropzone-title">Drag a resume PDF here</p>
        <p className="muted">or</p>
        <button
          type="button"
          className="btn"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          Browse files
        </button>
        <label className="sr-only" htmlFor="pdf-input">
          Choose a resume PDF to upload
        </label>
        <input
          id="pdf-input"
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) startUpload(file)
          }}
        />
      </div>

      {busy && (
        <div className="upload-status" aria-live="polite">
          <div className="upload-file">
            {fileName} <span className="muted">({formatBytes(fileSize)})</span>
          </div>

          {phase === 'uploading' ? (
            <>
              <div
                className="progress"
                role="progressbar"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
              >
                <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="muted">Uploading… {Math.round(progress * 100)}%</p>
            </>
          ) : (
            <>
              <div
                className="progress progress-indeterminate"
                role="progressbar"
                aria-label="Indexing"
              >
                <div className="progress-fill" />
              </div>
              <p className="muted">
                Indexing… extracting text and embedding chunks. This can take a while for large
                PDFs.
              </p>
            </>
          )}
        </div>
      )}

      {phase === 'done' && result && (
        <div
          className={`notice ${deduplicated ? 'notice-info' : 'notice-success'}`}
          aria-live="polite"
        >
          {deduplicated ? (
            <>
              <strong>Already indexed</strong> — showing the existing document. Nothing new was
              stored.
            </>
          ) : (
            <>
              <strong>{result.file}</strong> indexed.
            </>
          )}
          <ul className="summary">
            {/* The success headline already names the file; the dedup one does not. */}
            {deduplicated && <li>{result.file}</li>}
            <li>
              {formatNumber(result.pages)} {pluralize(result.pages, 'page')}
            </li>
            <li>{formatNumber(result.characters)} characters</li>
            <li>
              {formatNumber(result.chunksStored)} {pluralize(result.chunksStored, 'chunk')} stored
            </li>
          </ul>
        </div>
      )}

      {phase === 'error' && rejectedAsNotResume && (
        <div className="notice notice-warn" role="alert">
          {fileName && (
            <div className="upload-file">
              {fileName} <span className="muted">({formatBytes(fileSize)})</span>
            </div>
          )}
          <p className="notice-title">This file isn&rsquo;t a resume, so it wasn&rsquo;t indexed.</p>
          {rejectionReason && <p className="muted">{rejectionReason}</p>}
          <p className="muted">A file we can index looks like:</p>
          <ul className="summary">
            <li>One person&rsquo;s resume or CV — usually 1&ndash;3 pages</li>
            <li>A text PDF exported from a document, not a photo or a scan</li>
            <li>Not a report, proposal, contract or cover letter</li>
          </ul>
          <div className="notice-actions">
            <button type="button" className="btn btn-small" onClick={() => inputRef.current?.click()}>
              Choose a different file
            </button>
          </div>
        </div>
      )}

      {phase === 'error' && !rejectedAsNotResume && (
        <div className="notice notice-error" role="alert">
          {fileName && (
            <div className="upload-file">
              {fileName} <span className="muted">({formatBytes(fileSize)})</span>
            </div>
          )}
          {error}
        </div>
      )}
    </section>
  )
})

export default UploadPanel
