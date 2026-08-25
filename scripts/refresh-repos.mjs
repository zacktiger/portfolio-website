/**
 * Rewrites the `archiveFallback` array in `src/data/portfolioData.js` from the
 * live GitHub API.
 *
 * The site does not need this to stay current — it reads `/api/repos` at
 * runtime. This only refreshes the copy baked into the build, which is what
 * visitors see if that endpoint is ever unreachable.
 *
 *     npm run refresh:repos
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { fetchGitHubRepos } from '../api/_repos.js'
import { isArchived, repoOverrides } from '../src/data/portfolioData.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = resolve(__dirname, '../src/data/portfolioData.js')
const USERNAME = 'zacktiger'

/** Quote a string as a JS single-quoted literal, or `null` for empty. */
function quote(value) {
    if (value === null || value === undefined || value === '') return 'null'
    return "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

function serialise(repo) {
    return [
        '    {',
        `        name: ${quote(repo.name)},`,
        `        url: ${quote(repo.url)},`,
        `        homepage: ${quote(repo.homepage)},`,
        `        description: ${quote(repo.description)},`,
        `        language: ${quote(repo.language)},`,
        `        stars: ${repo.stars},`,
        `        createdAt: ${quote(repo.createdAt)},`,
        `        pushedAt: ${quote(repo.pushedAt)},`,
        '    },',
    ].join('\n')
}

const repos = await fetchGitHubRepos(USERNAME)
if (repos.length === 0) {
    console.error('GitHub returned no repositories — leaving portfolioData.js untouched.')
    process.exit(1)
}

// `isArchived` is the site's own membership rule, imported rather than
// reimplemented, so the baked fallback and the live render can never disagree
// about which repos exist. Note what this means in practice: a repo you pushed
// but haven't written about in `repoOverrides` will NOT appear here, and the
// summary below lists it as skipped.
const kept = repos.filter((repo) => isArchived(repo.name))

const source = await readFile(DATA_FILE, 'utf8')
const block = `export const archiveFallback = [\n${kept.map(serialise).join('\n')}\n]`
const updated = source.replace(/export const archiveFallback = \[[\s\S]*?\n\]/, block)

if (updated === source) {
    console.error('Could not find the `archiveFallback` array in portfolioData.js.')
    process.exit(1)
}

await writeFile(DATA_FILE, updated, 'utf8')

const skippedRepos = repos.filter((repo) => !isArchived(repo.name))
console.log(`Refreshed archive fallback with ${kept.length} repos:`)
for (const repo of kept) {
    const label = repoOverrides[repo.name]?.category || '(uncategorised)'
    console.log(`  · ${repo.name.padEnd(38)} ${label}`)
}
// Worth printing by name: this is where you'd notice a repo you meant to add.
console.log(`
Not listed (${skippedRepos.length}) — featured above, or no entry in repoOverrides:`)
for (const repo of skippedRepos) {
    console.log(`  · ${repo.name}`)
}
