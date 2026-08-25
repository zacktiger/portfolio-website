import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Routes that are Vercel functions in production and nothing at all locally.
 * Add a file to `api/` and its route here, and `npm run dev` exercises the
 * same handler the deployed site runs.
 */
const API_ROUTES = ['/api/medium', '/api/repos']

/**
 * Serves the `api/` handlers during `npm run dev`.
 *
 * The dev server knows nothing about `api/`, so without this the writing
 * section and the project archive would always render their offline
 * fallbacks locally. Reusing the same handlers keeps dev honest.
 */
function vercelApiDevServer() {
    return {
        name: 'vercel-api-dev-server',
        apply: 'serve',
        configureServer(server) {
            for (const route of API_ROUTES) {
                server.middlewares.use(route, async (req, res) => {
                    const { default: handler } = await server.ssrLoadModule(`${route}.js`)
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
            }
        },
    }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    vercelApiDevServer(),
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
