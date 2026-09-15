/**
 * Shown when the app fails before it can render anything — in practice, a
 * missing or malformed value in `.env`.
 *
 * Kept free of every other import on purpose: whatever broke the startup must
 * not be able to break the screen that reports it.
 */
export default function StartupError({ error }) {
  return (
    <div className="boot-screen">
      <div className="notice notice-error startup-error">
        <strong>The app could not start.</strong>
        <p>{error?.message || String(error)}</p>
        <p className="muted">
          <code>.env</code> at the project root is the only place this app reads URLs and ports
          from.
        </p>
      </div>
    </div>
  )
}
