/**
 * Everything the app knows about the auth backend.
 *
 * The contract lives at the top of this file and nowhere else: the four paths,
 * the request bodies, and the two adapters that read a response. No component
 * or hook knows an endpoint or a field name.
 */

import { ApiError, request } from './http.js'
import { clearSession, getSession, saveSession } from './session.js'

/* ------------------------------------------------------------------ *
 * The contract
 * ------------------------------------------------------------------ */

export const AUTH_ENDPOINTS = {
  signUp: '/api/auth/signup',
  signIn: '/api/auth/login',
  signOut: '/api/auth/logout',
  currentUser: '/api/auth/me',
}

/** Exactly the bands the backend accepts — the dropdown is built from this. */
export const EMPLOYEE_STRENGTH_OPTIONS = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
]

/**
 * Suggestions only. The field is a free-text input with a datalist behind it,
 * so an industry nobody thought of still gets through.
 */
export const INDUSTRY_SUGGESTIONS = [
  'Software & IT Services',
  'Staffing & Recruiting',
  'Financial Services',
  'Healthcare',
  'Education',
  'Manufacturing',
  'Retail & E-commerce',
  'Consulting',
  'Media & Marketing',
  'Real Estate',
  'Logistics & Transport',
  'Government & Public Sector',
]

/**
 * Both `email` and `phone` are required at signup: login accepts either one as
 * the identifier, and there is no signing in with a phone number the account
 * never stored.
 *
 * `confirmPassword` goes over the wire too — the server checks the match as
 * well, and the client check is only there to fail faster.
 */
const toSignUpBody = (values) => ({
  fullName: values.fullName.trim(),
  email: values.email.trim().toLowerCase(),
  phone: normalizePhone(values.phone),
  companyName: values.companyName.trim(),
  designation: values.designation.trim(),
  employeeStrength: values.employeeStrength,
  companyIndustry: values.companyIndustry.trim(),
  password: values.password,
  confirmPassword: values.confirmPassword,
})

/**
 * One field, not two. The backend splits on the `@`: with one it is an email,
 * without one it is a phone number — so the form is a single box and the user
 * never has to tell us which they typed.
 */
const toSignInBody = ({ identifier, password }) => ({
  identifier: looksLikeEmail(identifier)
    ? identifier.trim().toLowerCase()
    : normalizePhone(identifier),
  password,
})

export function looksLikeEmail(value) {
  return typeof value === 'string' && value.includes('@')
}

/**
 * Spaces, dashes and brackets are how people type a phone number and not how a
 * lookup matches one, so they come off before the value is sent. A leading `+`
 * survives — it is the country code, not decoration.
 */
export function normalizePhone(value) {
  const trimmed = String(value ?? '').trim()
  const digits = trimmed.replace(/[^\d]/g, '')
  return trimmed.startsWith('+') ? `+${digits}` : digits
}

/**
 * Pulls the user out of a response. Deliberately tolerant about where it sits
 * and what it is called — a nested `data` wrapper or an `_id` costs nothing to
 * support and saves a round of edits if the shape is not quite this.
 */
function toUser(raw) {
  const source = raw?.user ?? raw?.data?.user ?? raw?.data ?? raw
  if (!source || typeof source !== 'object') return null

  const id = source.id ?? source._id ?? source.userId ?? null
  const email = source.email ?? null
  if (!id && !email) return null

  return {
    id: id ? String(id) : email,
    email: email || '',
    phone: source.phone ?? '',
    fullName: source.fullName ?? source.name ?? '',
    companyName: source.companyName ?? '',
    designation: source.designation ?? '',
    employeeStrength: source.employeeStrength ?? '',
    companyIndustry: source.companyIndustry ?? '',
    createdAt: source.createdAt ?? null,
    // 'user' unless the server says otherwise; only 'admin' unlocks /admin.
    role: source.role === 'admin' ? 'admin' : 'user',
    promptsUsed: Number.isFinite(source.promptsUsed) ? source.promptsUsed : 0,
  }
}

/** Pulls the bearer token out of a response, same tolerance. */
function toToken(raw) {
  return raw?.token ?? raw?.accessToken ?? raw?.data?.token ?? raw?.data?.accessToken ?? null
}

/**
 * A successful signup or login has to yield both a token and a user — that is
 * what the rest of the app runs on. A 2xx carrying neither is a contract
 * mismatch, and saying so beats a blank screen.
 */
function toSession(body) {
  const token = toToken(body)
  const user = toUser(body)

  if (!token || !user) {
    throw new ApiError(
      'Signed in, but the response did not include the expected token and user. ' +
        'Check the shape the API returns against src/api/auth.js.',
      { status: 200 },
    )
  }

  return { token, refreshToken: body?.refreshToken ?? null, user }
}

/* ------------------------------------------------------------------ *
 * Calls
 * ------------------------------------------------------------------ */

/** POST /api/auth/signup — creates the account and signs straight in. */
export async function signUp(values, { signal } = {}) {
  if (MOCK) return mockSignUp(values)
  const body = await request(AUTH_ENDPOINTS.signUp, {
    method: 'POST',
    json: toSignUpBody(values),
    auth: false,
    // A 4xx here is "that email is taken", not a dead session.
    skipAuthRedirect: true,
    signal,
  })
  return toSession(body)
}

/** POST /api/auth/login — `identifier` is an email or a phone number. */
export async function signIn({ identifier, password, signal } = {}) {
  if (MOCK) return mockSignIn({ identifier, password })
  const body = await request(AUTH_ENDPOINTS.signIn, {
    method: 'POST',
    json: toSignInBody({ identifier, password }),
    auth: false,
    // A 401 here is a wrong password; it belongs in the form, not in a
    // session-expired redirect.
    skipAuthRedirect: true,
    signal,
  })
  return toSession(body)
}

/**
 * POST /api/auth/logout
 *
 * The token is discarded client-side either way. Whether or not the call
 * lands, the local session goes — a sign-out that appeared to fail because the
 * backend was down would be worse than useless.
 */
export async function signOut({ signal } = {}) {
  const hadSession = Boolean(getSession())
  try {
    if (!MOCK && hadSession) {
      await request(AUTH_ENDPOINTS.signOut, { method: 'POST', skipAuthRedirect: true, signal })
    }
  } catch {
    // Swallowed on purpose; see above.
  } finally {
    clearSession('signed-out')
  }
}

/**
 * GET /api/auth/me — used on boot to check a stored token is still good.
 * Throws on a 401 (token is dead) and on a network error (we simply do not
 * know yet); the caller tells those two apart.
 */
export async function getCurrentUser({ signal } = {}) {
  if (MOCK) return mockCurrentUser()
  const body = await request(AUTH_ENDPOINTS.currentUser, { signal })
  const user = toUser(body)
  if (!user) throw new ApiError('The session check returned no user.', { status: 200 })
  return user
}

/* ------------------------------------------------------------------ *
 * Offline mock
 *
 * VITE_AUTH_MOCK=true keeps the flow clickable without a backend: accounts
 * live in localStorage and nothing leaves the browser. Off unless the flag is
 * set. Delete this section once the API is live.
 * ------------------------------------------------------------------ */

const MOCK = import.meta.env.VITE_AUTH_MOCK === 'true'

export const USING_MOCK_AUTH = MOCK

const MOCK_USERS_KEY = 'rangify.mock-users'
const MOCK_DELAY_MS = 700

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function readMockUsers() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MOCK_USERS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeMockUsers(users) {
  try {
    window.localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))
  } catch {
    // Accounts just will not survive a reload. Fine for a mock.
  }
}

function mockSessionFor(account) {
  const user = { ...account }
  // The stored password never belongs in the session the app hands around.
  delete user.password
  return { token: `mock.${account.id}.${Date.now().toString(36)}`, refreshToken: null, user }
}

async function mockSignUp(values) {
  await wait(MOCK_DELAY_MS)
  const body = toSignUpBody(values)
  const users = readMockUsers()

  if (users.some((u) => u.email === body.email)) {
    throw new ApiError('An account with that email already exists.', { status: 409 })
  }
  if (users.some((u) => u.phone === body.phone)) {
    throw new ApiError('An account with that phone number already exists.', { status: 409 })
  }

  const account = {
    ...body,
    id: `mock_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  }
  delete account.confirmPassword
  users.push(account)
  writeMockUsers(users)
  return mockSessionFor(account)
}

async function mockSignIn({ identifier, password }) {
  await wait(MOCK_DELAY_MS)
  const { identifier: needle } = toSignInBody({ identifier, password })
  const account = readMockUsers().find((u) => u.email === needle || u.phone === needle)

  // One message for both cases: which half was wrong is not the user's
  // business, and saying confirms whether an account exists.
  if (!account || account.password !== password) {
    throw new ApiError('Incorrect email/phone or password.', { status: 401 })
  }
  return mockSessionFor(account)
}

async function mockCurrentUser() {
  const session = getSession()
  if (!session) throw new ApiError('Not signed in.', { status: 401 })
  return session.user
}

/* ------------------------------------------------------------------ */

// Re-exported so the auth hook has one import for the whole surface.
export { clearSession, getSession, saveSession }
