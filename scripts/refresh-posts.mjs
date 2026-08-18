/**
 * Rewrites the `posts` array in `src/data/portfolioData.js` from the live
 * Medium feed.
 *
 * The site does not need this to stay current — it reads `/api/medium` at
 * runtime. This only refreshes the copy baked into the build, which is what
 * visitors see if that endpoint is ever unreachable.
 *
 *     npm run refresh:posts
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { fetchMediumPosts } from '../api/_feed.js'
import { writingProfile, postOverrides } from '../src/data/portfolioData.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = resolve(__dirname, '../src/data/portfolioData.js')

/** Quote a string as a JS single-quoted literal. */
function quote(value) {
    return "'" + value.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

function serialise(post) {
    const lines = [
        `        title: ${quote(post.title)},`,
        `        blurb: ${quote(post.blurb)},`,
        `        date: ${quote(post.date)},`,
        `        readMinutes: ${post.readMinutes},`,
    ]
    if (post.tag) lines.push(`        tag: ${quote(post.tag)},`)
    lines.push(`        url: ${quote(post.url)},`)
    if (post.cover) lines.push(`        cover: ${quote(post.cover)},`)
    return `    {\n${lines.join('\n')}\n    },`
}

const feedPosts = await fetchMediumPosts(writingProfile.feed)
if (feedPosts.length === 0) {
    console.error('Feed returned no posts — leaving portfolioData.js untouched.')
    process.exit(1)
}

// Bake in the same overrides the site applies at runtime, so the fallback and
// the live render look identical.
const merged = feedPosts.map((post) => ({ ...post, ...(postOverrides[post.url] || {}) }))

const source = await readFile(DATA_FILE, 'utf8')
const block = `export const posts = [\n${merged.map(serialise).join('\n')}\n]`
const updated = source.replace(/export const posts = \[[\s\S]*?\n\]/, block)

if (updated === source) {
    console.error('Could not find the `posts` array in portfolioData.js.')
    process.exit(1)
}

await writeFile(DATA_FILE, updated, 'utf8')
console.log(`Refreshed fallback with ${merged.length} posts:`)
for (const post of merged) console.log(`  · ${post.date}  ${post.title}`)
