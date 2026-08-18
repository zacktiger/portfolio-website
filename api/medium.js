import { fetchMediumPosts } from './_feed.js'

const FEED_URL = 'https://medium.com/feed/@kshitijbachhav005'

/**
 * GET /api/medium → `{ posts: [...], fetchedAt }`
 *
 * The browser cannot read medium.com's feed directly (no CORS header), so this
 * function does it server-side and hands back the parsed posts.
 *
 * Caching is what makes "immediately" affordable: Vercel's edge serves a cached
 * copy for 5 minutes, then keeps serving the stale one while it revalidates in
 * the background. Visitors always get an instant response, and a newly
 * published article shows up within ~5 minutes without a redeploy.
 */
export default async function handler(req, res) {
    res.setHeader(
        'Cache-Control',
        'public, s-maxage=300, stale-while-revalidate=86400'
    )

    try {
        const posts = await fetchMediumPosts(FEED_URL)
        return res.status(200).json({ posts, fetchedAt: new Date().toISOString() })
    } catch (error) {
        // Don't cache a failure — the next request should retry rather than be
        // pinned to an error for five minutes.
        res.setHeader('Cache-Control', 'no-store')
        // 502 tells the client "upstream is unhappy", which is its cue to fall
        // back to the posts bundled with the build.
        return res.status(502).json({ error: error.message, posts: [] })
    }
}
