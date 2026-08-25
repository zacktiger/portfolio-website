import { fetchGitHubRepos } from './_repos.js'

const USERNAME = 'zacktiger'

/**
 * GET /api/repos → `{ repos: [...], fetchedAt }`
 *
 * Backs the project archive. The browser *could* call api.github.com directly
 * (unlike Medium, GitHub does send CORS headers), but its unauthenticated rate
 * limit is 60 requests per hour **per visitor IP** — a shared campus or office
 * network would blow through that and see an empty archive. Going through the
 * edge means one upstream call serves everyone.
 *
 * Cached for 30 minutes with a long stale-while-revalidate: a new repo shows up
 * on the site by itself within half an hour, and no visitor ever waits on
 * GitHub.
 */
export default async function handler(req, res) {
    res.setHeader(
        'Cache-Control',
        'public, s-maxage=1800, stale-while-revalidate=86400'
    )

    try {
        const repos = await fetchGitHubRepos(USERNAME)
        return res.status(200).json({ repos, fetchedAt: new Date().toISOString() })
    } catch (error) {
        // Don't cache a failure — the next request should retry rather than be
        // pinned to an error for half an hour.
        res.setHeader('Cache-Control', 'no-store')
        // 502 is the client's cue to keep rendering the bundled archive.
        return res.status(502).json({ error: error.message, repos: [] })
    }
}
