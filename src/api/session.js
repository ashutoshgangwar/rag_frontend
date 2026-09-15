/**
 * Where the signed-in session lives between page loads.
 *
 * No network and no React: both the HTTP layer (which needs the token for the
 * Authorization header) and the auth hook (which needs the user) read from
 * here, so this module has to be importable by either without a cycle.
 *
 * It is also the single source of truth. Nothing keeps its own copy of the
 * session in state — `subscribe` pushes every change out instead, which is
 * what makes a sign-out in one tab sign the others out too.
 */

const STORAGE_KEY = 'rangify.session'

/**
 * "Remember me" off means the session must not outlive the tab, so it goes to
 * sessionStorage. Reads check both; a write picks one and clears the other, so
 * a session can never exist in two places at once.
 */
function stores() {
  const found = []
  try {
    found.push(window.localStorage)
  } catch {
    // Storage disabled (Safari private mode, blocked cookies): skip it.
  }
  try {
    found.push(window.sessionStorage)
  } catch {
    // Same.
  }
  return found
}

/**
 * A stored session is only usable if it still has a token and a user. Anything
 * else — a half-written value, a shape from an older build — is treated as no
 * session at all rather than crashing the app on boot.
 */
function isUsable(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.token === 'string' &&
      value.token.length > 0 &&
      value.user &&
      typeof value.user === 'object',
  )
}

function readStored() {
  for (const store of stores()) {
    let raw
    try {
      raw = store.getItem(STORAGE_KEY)
    } catch {
      continue
    }
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      if (isUsable(parsed)) return parsed
    } catch {
      // Corrupt entry: drop it so it cannot fail again on the next load.
    }
    try {
      store.removeItem(STORAGE_KEY)
    } catch {
      // Nothing we can do; the isUsable check above still keeps us safe.
    }
  }
  return null
}

let current = readStored()
const listeners = new Set()

function notify(reason) {
  for (const listener of listeners) listener(current, reason)
}

/** The session as it stands, or null when signed out. */
export function getSession() {
  return current
}

/** Just the bearer token — what the HTTP layer actually wants. */
export function getAccessToken() {
  return current?.token ?? null
}

/**
 * Persist a freshly issued session. `remember` picks which storage it lands
 * in; it is kept on the session itself so a later refresh writes to the same
 * place without the caller having to remember the choice.
 */
export function saveSession(session, { remember = true } = {}) {
  if (!isUsable(session)) throw new Error('Refusing to store an incomplete session.')

  const next = { ...session, remember }
  current = next

  const [local, sessionStore] = [readStore('local'), readStore('session')]
  const target = remember ? local : sessionStore
  const other = remember ? sessionStore : local

  try {
    target?.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage full or blocked: the session still works for this page load.
  }
  try {
    other?.removeItem(STORAGE_KEY)
  } catch {
    // Same.
  }

  notify('signed-in')
  return next
}

/**
 * `reason` travels with the change so the UI can tell the two apart: 'expired'
 * earns an explanation on the sign-in screen, 'signed-out' does not.
 */
export function clearSession(reason = 'signed-out') {
  const had = current !== null
  current = null
  for (const store of stores()) {
    try {
      store.removeItem(STORAGE_KEY)
    } catch {
      // Ignore.
    }
  }
  if (had) notify(reason)
}

/** Merge new user fields in place — after `me` confirms the token, say. */
export function updateUser(user) {
  if (!current || !user || typeof user !== 'object') return current
  return saveSession({ ...current, user: { ...current.user, ...user } }, {
    remember: current.remember ?? true,
  })
}

function readStore(kind) {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

/**
 * A write from another tab only ever reaches us here. One listener for the
 * whole module, not one per subscriber: each subscriber installing its own
 * would leave all but the first to reconcile `current` seeing no change and
 * bailing out.
 */
window.addEventListener('storage', (event) => {
  // A `null` key means the whole storage area was cleared.
  if (event.key !== null && event.key !== STORAGE_KEY) return
  const next = readStored()
  if (next?.token === current?.token) return
  current = next
  notify(next ? 'signed-in' : 'signed-out')
})

/**
 * Call `listener(session, reason)` on every change, including changes made by
 * another tab. Returns the unsubscribe function.
 */
export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
