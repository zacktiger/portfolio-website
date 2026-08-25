/**
 * Shared GitHub repository fetching + normalising.
 *
 * Imported by the serverless function (`api/repos.js`) and by the dev
 * middleware in `vite.config.js`, so there is exactly one place where the
 * GitHub payload is understood. The leading underscore keeps Vercel from
 * routing this file as an endpoint of its own — same trick as `_feed.js`.
 */

const GITHUB_API = 'https://api.github.com'

/**
 * Reduce GitHub's very large repo object down to the handful of fields the
 * archive actually renders. Anything the site wants to say beyond this comes
 * from `repoOverrides` in `portfolioData.js`, not from here.
 */
function normaliseRepo(repo) {
    return {
        name: repo.name,
        url: repo.html_url,
        homepage: repo.homepage || null,
        description: repo.description || '',
        language: repo.language || null,
        stars: repo.stargazers_count || 0,
        topics: repo.topics || [],
        // `pushed_at` is when the work last happened; `created_at` is when the
        // repo was made. The archive sorts on the former and labels with the
        // latter, so a project started in 2025 and polished in 2026 still
        // reads as a 2025 project.
        createdAt: repo.created_at,
        pushedAt: repo.pushed_at,
    }
}

/**
 * Every public, non-fork repository for `username`, most recently pushed first.
 *
 * Unauthenticated GitHub requests are capped at 60/hour per IP. That is plenty
 * behind the edge cache in `api/repos.js`, but if `GITHUB_TOKEN` is set in the
 * environment it is used, lifting the ceiling to 5,000/hour.
 */
export async function fetchGitHubRepos(username) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'portfolio-site',
    }
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const res = await fetch(
        `${GITHUB_API}/users/${username}/repos?per_page=100&sort=pushed&type=owner`,
        { headers }
    )

    if (!res.ok) {
        throw new Error(`GitHub responded ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    if (!Array.isArray(data)) {
        throw new Error('GitHub returned an unexpected payload')
    }

    return data
        .filter((repo) => !repo.fork && !repo.archived && !repo.private)
        .map(normaliseRepo)
        .sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt))
}
