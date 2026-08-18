/**
 * Medium RSS → post objects.
 *
 * Runs server-side only (the Vercel function and the refresh script), because
 * medium.com serves its feed without an `Access-Control-Allow-Origin` header —
 * a browser can never fetch it directly.
 *
 * The output shape is deliberately identical to the hand-written entries in
 * `src/data/portfolioData.js`, so `Writing.jsx` renders live posts and the
 * bundled fallback through the same card component.
 */

const WORDS_PER_MINUTE = 200

const ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    hellip: '…', mdash: '—', ndash: '–',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
}

function decodeEntities(str) {
    return str
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
}

/** Unwrap `<![CDATA[…]]>`, drop tags, decode entities, collapse whitespace. */
function toText(html) {
    if (!html) return ''
    return decodeEntities(
        html
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
            .replace(/<[^>]*>/g, ' ')
    )
        // Medium peppers its markup with non-breaking and zero-width spaces;
        // they render as stray gaps and skew the word count.
        .replace(/[\u00a0\u200b\u2028\u2029]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function tagContent(source, tag) {
    const m = source.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>', 'i'))
    return m ? m[1] : ''
}

function unwrapCdata(str) {
    const m = str.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
    return m ? m[1] : str
}

/** Trim to a whole word near `max` chars so blurbs never cut mid-word. */
function truncate(text, max = 180) {
    if (text.length <= max) return text
    const cut = text.slice(0, max)
    const lastSpace = cut.lastIndexOf(' ')
    return cut.slice(0, lastSpace > 0 ? lastSpace : max).replace(/[,;:.\s]+$/, '') + '…'
}

/**
 * Medium's CDN encodes the render width in the path (`/max/353/…`), and the
 * width it picks for the feed is far too small for a 16:9 card — asking for
 * 1200 keeps covers crisp on retina displays.
 */
function upscaleCover(src) {
    return src.replace(/\/max\/\d+\//, '/max/1200/')
}

/**
 * Feed categories arrive as lowercase slugs (`crude-oil`). Title-case them so
 * the tag chip reads like a label rather than a URL fragment.
 */
function prettifyTag(slug) {
    if (!slug) return null
    return slug
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ')
}

/**
 * Medium appends a `?source=rss-…` tracking param to every link. Stripping it
 * gives a stable canonical URL, which doubles as the React key and as the
 * lookup key for `postOverrides`.
 */
function cleanUrl(rawUrl) {
    const url = toText(rawUrl)
    try {
        const parsed = new URL(url)
        parsed.search = ''
        parsed.hash = ''
        return parsed.toString()
    } catch {
        return url.split('?')[0]
    }
}

function parseItem(item) {
    const url = cleanUrl(tagContent(item, 'link'))
    const title = toText(tagContent(item, 'title'))
    if (!url || !title) return null

    const content = unwrapCdata(tagContent(item, 'content:encoded'))

    // Medium's own subtitle is the first <h3> and reads like a magazine dek,
    // which is exactly what the card wants. Fall back to the opening
    // paragraph when a post has no subtitle.
    const subtitle = toText(tagContent(content, 'h3'))
    const firstPara = toText(tagContent(content, 'p'))
    const blurb = truncate(subtitle || firstPara)

    const coverMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i)
    const words = toText(content).split(' ').filter(Boolean).length

    const published = new Date(toText(tagContent(item, 'pubDate')))
    const date = Number.isNaN(published.getTime())
        ? null
        : published.toISOString().slice(0, 10)

    // A post carries a <category> only if it was tagged on Medium, and the
    // first tag is not always the most descriptive one — `postOverrides` is
    // there to override it per post.
    const tag = prettifyTag(toText(tagContent(item, 'category')))

    return {
        title,
        blurb,
        date,
        readMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
        tag,
        url,
        cover: coverMatch ? upscaleCover(decodeEntities(coverMatch[1])) : null,
    }
}

/** Parse a Medium RSS document into newest-first post objects. */
export function parseFeed(xml) {
    return (xml.match(/<item>[\s\S]*?<\/item>/g) || [])
        .map(parseItem)
        .filter(Boolean)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

/** Fetch and parse a Medium profile feed. Throws on a non-2xx response. */
export async function fetchMediumPosts(feedUrl, { timeoutMs = 8000 } = {}) {
    const res = await fetch(feedUrl, {
        headers: {
            // Medium serves a bot-challenge page to header-less clients.
            'User-Agent': 'Mozilla/5.0 (compatible; portfolio-site/1.0; +https://kshitijbachhav.dev)',
            Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
        },
        signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new Error('Medium feed responded ' + res.status)
    return parseFeed(await res.text())
}
