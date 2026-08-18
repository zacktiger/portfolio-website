import { useEffect, useState } from 'react'
import { posts as fallbackPosts, postOverrides } from '../data/portfolioData'

/** Apply the hand-tuned fields from `postOverrides` on top of a feed post. */
function withOverrides(post) {
    const override = postOverrides[post.url]
    return override ? { ...post, ...override } : post
}

/**
 * Live Medium articles, with the build-time copy as a safety net.
 *
 * `/api/medium` is a Vercel function that reads the RSS feed server-side —
 * the browser can't, because medium.com sends no CORS header. Until it
 * answers (and forever, if it can't) the bundled `posts` array renders, so
 * the section is never empty and never blocks paint on a network round-trip.
 *
 * Returns `{ posts, isLive, isLoading }`.
 */
export default function useMediumPosts() {
    const [posts, setPosts] = useState(() => fallbackPosts.map(withOverrides))
    const [isLive, setIsLive] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Guards against a state update after unmount, and against a slow
        // request outliving the component.
        const controller = new AbortController()

        async function load() {
            try {
                const res = await fetch('/api/medium', { signal: controller.signal })
                if (!res.ok) throw new Error(`/api/medium responded ${res.status}`)

                const data = await res.json()
                if (!Array.isArray(data.posts) || data.posts.length === 0) {
                    throw new Error('feed returned no posts')
                }

                setPosts(data.posts.map(withOverrides))
                setIsLive(true)
            } catch (error) {
                if (error.name === 'AbortError') return
                // Not a user-facing failure: the bundled posts are already
                // on screen, so this is only worth a console breadcrumb.
                console.warn('[writing] live Medium feed unavailable —', error.message)
            } finally {
                if (!controller.signal.aborted) setIsLoading(false)
            }
        }

        load()
        return () => controller.abort()
    }, [])

    return { posts, isLive, isLoading }
}
