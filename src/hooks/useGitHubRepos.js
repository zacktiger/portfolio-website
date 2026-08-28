import { useEffect, useMemo, useState } from 'react'
import {
    archiveFallback,
    archiveCategories,
    archiveDefaultCategory,
    isArchived,
    repoOverrides,
} from '../data/portfolioData'

/** `Url_shortner` → `Url shortner`; used only when no override supplies a title. */
function humanise(name) {
    return name
        .replace(/[-_.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * A short label for when the work happened.
 *
 * One year if it started and finished in the same one, a range if it spanned
 * two — the same shorthand the resume uses.
 */
function yearLabel(createdAt, pushedAt) {
    const start = new Date(createdAt).getFullYear()
    const end = new Date(pushedAt).getFullYear()
    if (!start || Number.isNaN(start)) return ''
    return start === end ? String(start) : `${start}–${String(end).slice(2)}`
}

/**
 * Merge a repo from GitHub with its hand-tuned entry in `repoOverrides`.
 *
 * Returns `null` for anything the archive does not list. Membership is decided
 * by `isArchived` in portfolioData.js, not here — the archive is a curated
 * surface, so a repo that has never been written about stays off the site even
 * though GitHub is perfectly happy to tell us about it.
 */
function decorate(repo) {
    if (!isArchived(repo.name)) return null

    const override = repoOverrides[repo.name]

    return {
        name: repo.name,
        title: override?.title || humanise(repo.name),
        description: override?.description || repo.description || '',
        language: override?.language || repo.language || null,
        category: override?.category || archiveDefaultCategory,
        url: repo.url,
        live: override?.live ?? repo.homepage ?? null,
        stars: repo.stars || 0,
        year: yearLabel(repo.createdAt, repo.pushedAt),
        pushedAt: repo.pushedAt,
    }
}

/**
 * The categories that actually have repos, in `archiveCategories` order, with
 * their counts — the filter chips above the grid.
 *
 * Grouping used to be structural: five headings in a left gutter with the
 * repos stacked beneath each. That is what made the section 2.1 screens tall.
 * The same information now rides on a single row of chips, so choosing a
 * category shortens the section instead of scrolling further down it.
 */
function countByCategory(repos) {
    return archiveCategories
        .map((category) => ({
            category,
            count: repos.filter((r) => r.category === category).length,
        }))
        .filter((group) => group.count > 0)
}

/**
 * The live project archive, with the build-time copy as a safety net.
 *
 * `/api/repos` is a Vercel function that reads the GitHub API server-side and
 * caches the answer at the edge — see that file for why this doesn't call
 * api.github.com from the browser. Until it answers (and forever, if it can't)
 * the bundled `archiveFallback` renders, so the section is never empty and
 * never blocks paint on a network round-trip.
 *
 * Returns `{ items, categories, count, isLive, isLoading }` — `items` is one
 * flat list, most recently pushed first, because the grid is filtered rather
 * than grouped.
 */
export default function useGitHubRepos() {
    const [repos, setRepos] = useState(archiveFallback)
    const [isLive, setIsLive] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Guards against a state update after unmount, and against a slow
        // request outliving the component.
        const controller = new AbortController()

        async function load() {
            try {
                const res = await fetch('/api/repos', { signal: controller.signal })
                if (!res.ok) throw new Error(`/api/repos responded ${res.status}`)

                const data = await res.json()
                if (!Array.isArray(data.repos) || data.repos.length === 0) {
                    throw new Error('GitHub returned no repositories')
                }

                setRepos(data.repos)
                setIsLive(true)
            } catch (error) {
                if (error.name === 'AbortError') return
                // Not a user-facing failure: the bundled archive is already on
                // screen, so this is only worth a console breadcrumb.
                console.warn('[projects] live GitHub archive unavailable —', error.message)
            } finally {
                if (!controller.signal.aborted) setIsLoading(false)
            }
        }

        load()
        return () => controller.abort()
    }, [])

    const items = useMemo(
        () =>
            repos
                .map(decorate)
                .filter(Boolean)
                .sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt)),
        [repos]
    )

    return {
        items,
        categories: useMemo(() => countByCategory(items), [items]),
        count: items.length,
        isLive,
        isLoading,
    }
}
