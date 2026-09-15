import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Ports come from .env, never from here.
 *
 * `import.meta.env` does not exist while the config itself is being evaluated,
 * so the file is read with loadEnv. The empty prefix loads every key, not just
 * the `VITE_` ones — the dev server port is build tooling and has no business
 * being shipped to the browser.
 *
 * Vite picks its own default when the port is unset, and steps to the next
 * free port if the chosen one is taken.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = env.VITE_DEV_PORT ? Number(env.VITE_DEV_PORT) : undefined
  const previewPort = env.VITE_PREVIEW_PORT ? Number(env.VITE_PREVIEW_PORT) : undefined

  return {
    plugins: [react()],
    server: { port },
    preview: { port: previewPort ?? port },
  }
})
