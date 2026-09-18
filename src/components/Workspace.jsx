/**
 * Everything behind the sign-in wall: the AI agent hub, plus health,
 * documents and chat for the RAG view.
 *
 * Split out of App so that none of these hooks — and none of their polling —
 * start until there is a session to make requests with.
 */
import { useCallback, useRef } from 'react'
import Header from './Header.jsx'
import UploadPanel from './UploadPanel.jsx'
import DocumentList from './DocumentList.jsx'
import ChatWindow from './ChatWindow.jsx'
import AgentsView from './agents/AgentsView.jsx'
import PricingPage from './billing/PricingPage.jsx'
import AccountPage from './billing/AccountPage.jsx'
import PaywallModal from './billing/PaywallModal.jsx'
import AdminPage from './admin/AdminPage.jsx'
import { useHealth } from '../hooks/useHealth.js'
import { useDocuments } from '../hooks/useDocuments.js'
import { useChat } from '../hooks/useChat.js'
import { API_BASE_URL } from '../api/client.js'
import { matchAgentsRoute, matchPageRoute, useRoute } from '../hooks/useRoute.js'
import { useAuth } from '../auth/AuthContext.js'
import { isAdmin } from '../api/admin.js'

export default function Workspace() {
  const health = useHealth()
  const documents = useDocuments()
  const chat = useChat()
  const uploadRef = useRef(null)
  const { user } = useAuth()
  // /agents and /agents/:id are the agent views; /pricing, /account and
  // /admin are pages of their own; every other path is the document
  // workspace, exactly as it was before agents existed. /admin is simply not
  // a route for anyone but an admin — it falls through to documents.
  const { path, state: routeState, navigate } = useRoute()
  const agentsRoute = matchAgentsRoute(path)
  const page = matchPageRoute(path)
  const view = agentsRoute
    ? 'agents'
    : page === 'admin' && !isAdmin(user)
      ? 'documents'
      : (page ?? 'documents')
  const onViewChange = useCallback(
    (next) => navigate(next === 'agents' ? '/agents' : '/'),
    [navigate],
  )

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
        view={view}
        onViewChange={onViewChange}
      />

      {agentsRoute && (
        <main className="agents-view">
          <AgentsView route={agentsRoute} routeState={routeState} navigate={navigate} />
        </main>
      )}

      {(view === 'pricing' || view === 'account' || view === 'admin') && (
        <main className="page-main">
          {view === 'pricing' && <PricingPage />}
          {view === 'account' && <AccountPage />}
          {view === 'admin' && <AdminPage />}
        </main>
      )}

      {view === 'documents' && offline && (
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

      {view === 'documents' && health.status === 'degraded' && (
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

      {view === 'documents' && (
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
      )}

      {/* Opened by a 402 from any metered call, wherever it came from. */}
      <PaywallModal />
    </div>
  )
}
