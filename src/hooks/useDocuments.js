import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_PAGE_SIZE,
  deleteAllDocuments,
  deleteDocument,
  isAbortError,
  listChunks,
  listDocuments,
} from '../api/client.js'

/**
 * Owns the knowledge base: the paginated list of files, the whole-base `stats`
 * counters, and the destructive actions.
 *
 * Chunks are loaded per row, on demand, through `loadChunks` — components never
 * reach the network themselves.
 */
export function useDocuments({ pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const [files, setFiles] = useState([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ files: 0, chunks: 0 })
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [clearing, setClearing] = useState(false)
  const abortRef = useRef(null)

  const load = useCallback(
    async (nextOffset = offset) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      try {
        const body = await listDocuments({
          limit: pageSize,
          offset: nextOffset,
          signal: controller.signal,
        })
        setFiles(body.files || [])
        setTotal(body.total ?? 0)
        setStats(body.stats || { files: 0, chunks: 0 })
        setError(null)

        // The last page can empty out under us after a delete; step back rather
        // than stranding the user on a page that no longer exists.
        if (nextOffset > 0 && (body.files?.length ?? 0) === 0 && (body.total ?? 0) > 0) {
          const lastPageOffset = Math.max(0, Math.floor((body.total - 1) / pageSize) * pageSize)
          if (lastPageOffset !== nextOffset) {
            setOffset(lastPageOffset)
            return
          }
        }
        setOffset(nextOffset)
      } catch (err) {
        if (isAbortError(err)) return
        setError(err.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    },
    [offset, pageSize],
  )

  // Initial load, and any time the page changes.
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!cancelled) await load(offset)
    }
    run()
    return () => {
      cancelled = true
    }
    // `load` is intentionally left out: it closes over `offset`, and including
    // it would re-fire this effect on every render that changes the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, pageSize])

  useEffect(() => () => abortRef.current?.abort(), [])

  const refresh = useCallback(() => load(offset), [load, offset])

  const goToPage = useCallback(
    (nextOffset) => {
      setOffset(Math.max(0, nextOffset))
    },
    [],
  )

  /** Chunk previews for one file, fetched only when a row is expanded. */
  const loadChunks = useCallback(async (fileId, { limit = 50, offset: chunkOffset = 0, signal } = {}) => {
    return listChunks(fileId, { limit, offset: chunkOffset, signal })
  }, [])

  const removeOne = useCallback(
    async (fileId) => {
      setBusyId(fileId)
      try {
        const body = await deleteDocument(fileId)
        setError(null)

        // Apply the delete to local state before refetching. The server has
        // already confirmed it, so the row and the counters must not wait on
        // the reload: that request can be aborted by a concurrent load, fail,
        // or come back from a revalidating cache, and the panel would then go
        // on showing a document that no longer exists.
        const removedChunks = body?.chunksDeleted ?? files.find((f) => f.id === fileId)?.chunkCount ?? 0
        setFiles((prev) => prev.filter((f) => f.id !== fileId))
        setTotal((prev) => Math.max(0, prev - 1))
        setStats((prev) => ({
          files: Math.max(0, (prev?.files ?? 0) - 1),
          chunks: Math.max(0, (prev?.chunks ?? 0) - removedChunks),
        }))

        // Then reconcile with the server, which also pulls up the next page's
        // first row into the gap the delete left.
        await load(offset)
        return body
      } catch (err) {
        if (!isAbortError(err)) setError(err.message)
        throw err
      } finally {
        setBusyId(null)
      }
    },
    [files, load, offset],
  )

  const clearAll = useCallback(async () => {
    setClearing(true)
    try {
      const body = await deleteAllDocuments()
      setError(null)

      // Same reasoning as removeOne: the base is empty the moment the server
      // says so, not when the reload lands.
      setFiles([])
      setTotal(0)
      setStats({ files: 0, chunks: 0 })
      setOffset(0)
      await load(0)
      return body
    } catch (err) {
      if (!isAbortError(err)) setError(err.message)
      throw err
    } finally {
      setClearing(false)
    }
  }, [load])

  return {
    files,
    total,
    stats,
    offset,
    pageSize,
    loading,
    error,
    busyId,
    clearing,
    refresh,
    goToPage,
    loadChunks,
    removeOne,
    clearAll,
  }
}
