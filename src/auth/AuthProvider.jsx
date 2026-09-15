import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getCurrentUser,
  getSession,
  saveSession,
  signIn as signInRequest,
  signOut as signOutRequest,
  signUp as signUpRequest,
} from '../api/auth.js'
import { clearSession, subscribe, updateUser } from '../api/session.js'
import { isAbortError } from '../api/http.js'
import { AuthContext } from './AuthContext.js'

/**
 * Owns the signed-in state for the whole app.
 *
 * It does not store the session itself — src/api/session.js does, because the
 * HTTP layer needs the token too. This subscribes to that store instead, so a
 * token dropped anywhere (a 401 on any request, a sign-out in another tab)
 * lands here as a state update without anyone having to call back.
 *
 * status:
 *   'restoring'     — a stored token exists and is being checked
 *   'authenticated' — signed in
 *   'anonymous'     — signed out
 */
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSession())
  const [restoring, setRestoring] = useState(() => Boolean(getSession()))
  const [notice, setNotice] = useState(null)
  const [pending, setPending] = useState(false)
  const abortRef = useRef(null)

  // One subscription for every source of change, our own writes included.
  useEffect(
    () =>
      subscribe((next, reason) => {
        setSession(next)
        if (reason === 'expired') {
          setNotice('Your session expired. Sign in again to pick up where you left off.')
        } else if (next) {
          setNotice(null)
        }
      }),
    [],
  )

  // A token in storage is only a claim. Confirm it against the server before
  // showing the workspace, so a revoked token fails here rather than on the
  // user's first upload.
  useEffect(() => {
    // No stored token: `restoring` already initialised to false, so there is
    // nothing to check and nothing to unset.
    if (!getSession()) return undefined

    const controller = new AbortController()
    let cancelled = false

    ;(async () => {
      try {
        const user = await getCurrentUser({ signal: controller.signal })
        if (!cancelled) setSession(updateUser(user))
      } catch (err) {
        if (cancelled || isAbortError(err)) return
        // A 401 already cleared the session on its way through the HTTP
        // layer. Anything else — the backend is down, the endpoint is not
        // built yet — tells us nothing about the token, and signing the user
        // out over an unreachable server would be the wrong call.
        if (err.status === 401) clearSession('expired')
      } finally {
        if (!cancelled) setRestoring(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  /**
   * Both forms go through here: one in-flight request at a time, and the new
   * session written to the store rather than to state — the subscription above
   * is what turns it into a render.
   */
  const authenticate = useCallback(async (run, { remember }) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setPending(true)
    try {
      const result = await run(controller.signal)
      saveSession(result, { remember })
      return result
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setPending(false)
    }
  }, [])

  /** `identifier` is an email or a phone number; the API tells them apart. */
  const signIn = useCallback(
    ({ identifier, password, remember = true }) =>
      authenticate((signal) => signInRequest({ identifier, password, signal }), { remember }),
    [authenticate],
  )

  /** Takes the whole signup form; src/api/auth.js shapes the request body. */
  const signUp = useCallback(
    (values, { remember = true } = {}) =>
      authenticate((signal) => signUpRequest(values, { signal }), { remember }),
    [authenticate],
  )

  const signOut = useCallback(async () => {
    abortRef.current?.abort()
    await signOutRequest()
  }, [])

  const dismissNotice = useCallback(() => setNotice(null), [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      status: restoring ? 'restoring' : session ? 'authenticated' : 'anonymous',
      pending,
      notice,
      signIn,
      signUp,
      signOut,
      dismissNotice,
    }),
    [session, restoring, pending, notice, signIn, signUp, signOut, dismissNotice],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
