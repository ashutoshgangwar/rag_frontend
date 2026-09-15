import { useCallback, useRef } from 'react'
import Header from './components/Header.jsx'
import UploadPanel from './components/UploadPanel.jsx'
import DocumentList from './components/DocumentList.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import { useHealth } from './hooks/useHealth.js'
import { useDocuments } from './hooks/useDocuments.js'
import { useChat } from './hooks/useChat.js'
import { API_BASE_URL } from './api/client.js'

export default function App() {
  const health = useHealth()
  const documents = useDocuments()
  const chat = useChat()
  const uploadRef = useRef(null)

  const offline = health.status === 'unreachable'

  const jumpToUpload = useCallback(() => {
    uploadRef.current?.focus()
  }, [])

  // Re-uploading a failed document: same panel, but open the picker straight
  // away since the intent is already clear.
  const startReupload = useCallback(() => {
    uploadRef.current?.browse()
  }, [])

  // A new document changes both the list and the stats counters, and gives the
  // chat a reason to explain an empty answer asked seconds later.
  const handleUploaded = useCallback(() => {
    chat.noteUpload()
    documents.refresh()
  }, [chat, documents])

  // Deleting a document invalidates the upload receipt still showing above it.
  // Only on success: a delete that failed changed nothing.
  const handleDelete = useCallback(
    async (fileId) => {
      const body = await documents.removeOne(fileId)
      uploadRef.current?.dismissResult(fileId)
      return body
    },
    [documents],
  )

  const handleClearAll = useCallback(async () => {
    const body = await documents.clearAll()
    uploadRef.current?.dismissResult()
    return body
  }, [documents])

  const services = health.health?.services

  return (
    <div className="app">
      <Header
        health={health.health}
        status={health.status}
        error={health.error}
        onRefresh={health.refresh}
        stats={documents.stats}
      />

      {offline && (
        <div className="banner banner-error" role="alert">
          <div>
            <strong>Cannot reach the backend at {API_BASE_URL}. Is it running?</strong>
            <p className="muted">
              Start the RAG backend, then retry. If it is running on a different port, update
              <code> VITE_API_BASE_URL</code> in <code>.env</code> and restart the dev server.
            </p>
          </div>
          <button type="button" className="btn btn-small" onClick={health.refresh}>
            Retry
          </button>
        </div>
      )}

      {health.status === 'degraded' && (
        <div className="banner banner-warn" role="alert">
          <div>
            <strong>The backend is degraded.</strong>
            <p className="muted">
              {services?.mongodb?.error ||
                services?.ollama?.error ||
                'One or more services are unavailable. Uploads or answers may fail.'}
            </p>
          </div>
        </div>
      )}

      <main className="layout">
        <ChatWindow
          messages={chat.messages}
          pending={chat.pending}
          files={documents.files}
          onAsk={chat.ask}
          onCancel={chat.cancel}
          onClear={chat.clearConversation}
          onJumpToUpload={jumpToUpload}
          disabled={offline}
        />

        <aside className="sidebar">
          <UploadPanel ref={uploadRef} onUploaded={handleUploaded} />

          <DocumentList
            files={documents.files}
            total={documents.total}
            stats={documents.stats}
            offset={documents.offset}
            pageSize={documents.pageSize}
            loading={documents.loading}
            error={documents.error}
            busyId={documents.busyId}
            clearing={documents.clearing}
            onGoToPage={documents.goToPage}
            onLoadChunks={documents.loadChunks}
            onDelete={handleDelete}
            onClearAll={handleClearAll}
            onReupload={startReupload}
            onRefresh={documents.refresh}
          />
        </aside>
      </main>
    </div>
  )
}
