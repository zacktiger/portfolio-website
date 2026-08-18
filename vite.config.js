import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Serves `/api/medium` during `npm run dev`.
 *
 * In production that route is a Vercel function; the dev server knows nothing
 * about `api/`, so without this the writing section would always render its
 * offline fallback locally. Reusing the same handler keeps dev honest.
 */
function mediumApiDevServer() {
    return {
        name: 'medium-api-dev-server',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use('/api/medium', async (req, res) => {
                const { default: handler } = await server.ssrLoadModule('/api/medium.js')
                await handler(req, {
                    setHeader: (key, value) => res.setHeader(key, value),
                    status(code) {
                        res.statusCode = code
                        return this
                    },
                    json(body) {
                        res.setHeader('Content-Type', 'application/json')
                        res.end(JSON.stringify(body))
                        return this
                    },
                })
            })
        },
    }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mediumApiDevServer(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        resume: resolve(__dirname, 'resume.html'),
      },
    },
  },
})
