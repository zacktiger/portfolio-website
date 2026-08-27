/*
 * Regenerates the two featured-project figures in `public/`.
 *
 * These exist because two of the three case studies are backend work with
 * nothing worth photographing, and the honest substitute for a screenshot is
 * the measurement the project was built to produce. Every number below is
 * copied from that project's own benchmark run — if a benchmark is re-run, edit
 * the DATA blocks here and re-run `node scripts/make-project-charts.mjs`,
 * rather than editing the SVG.
 *
 * Design decisions worth keeping (they come from the dataviz method, and each
 * one is a rule rather than a preference):
 *
 *   · One measure across a few named categories → horizontal bars. The category
 *     names ("naive read-modify-write") are too long to sit under vertical bars.
 *   · ONE series per chart, so there is no legend — the title names the measure.
 *     Colour therefore never carries identity here.
 *   · SERIES is a stepped-down brand cyan, not `--color-accent` (#00d4ff)
 *     itself: at OKLCH L 0.80 the site's cyan is outside the 0.48–0.67 band a
 *     filled mark wants on a dark surface, and a 400px-wide block of it glares.
 *     #0099ba is the same hue at L 0.60. CRITICAL is the reserved status red,
 *     used ONLY for the strategy that loses money — never as "series 2".
 *     The pair clears every gate on this surface (CVD ΔE 17.9, normal 30.4,
 *     both ≥ 3:1 contrast); re-run the validator if either changes.
 *   · A status colour never carries meaning alone, so the failing bar is also
 *     marked "✗" and says what it did in words.
 *   · Bars have a square baseline end and a rounded data end.
 *   · Scales are LINEAR and start at zero. Pulse's slowest bar is 14× its
 *     fastest and that ratio is the finding — a log axis would flatter it.
 *
 * Type is sized for the real render size, not for the viewBox: the figure sits
 * in a `max-w-xl` (576px) frame, so the 800-unit viewBox is scaled by 0.72 and
 * a 16-unit label lands at ~11.5px. Nothing here is smaller than 14 units.
 *
 * Fonts are system stacks on purpose. The figure is loaded with <img>, which
 * cannot fetch the site's webfonts, so naming Inter here would silently fall
 * back to a default anyway.
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

// ── palette ────────────────────────────────────────────────────────────────
const SURFACE = '#121212'
const INK = '#f5f5f5'
const INK_2 = '#a0a0a0'
const INK_3 = '#808080'
const SERIES = '#0099ba'
const CRITICAL = '#d03b3b'
const RULE = 'rgba(255,255,255,0.10)'

const SANS = "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif"
const MONO = "ui-monospace,'Cascadia Mono','Segoe UI Mono',Consolas,monospace"

// ── geometry (800×500 = the 16:10 frame `.project-visual` reserves) ─────────
const W = 800
const H = 500
const BAR_X = 268 // bars start here; the label column is everything left of it
const BAR_MAX = 420 // longest bar, leaving room for its value label
const BAR_H = 26
const LABEL_R = 252 // right edge of the right-aligned category labels

const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Square at the baseline, rounded at the data end — the end that means
// something is the one that gets the radius.
function barPath(x, y, w, h, r = 5) {
    const rr = Math.max(0, Math.min(r, w))
    return `M${x},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w},${y + rr} V${y + h - rr} A${rr},${rr} 0 0 1 ${x + w - rr},${y + h} H${x} Z`
}

function chart({ title, subtitle, rows, unit, footnote, desc }) {
    const max = Math.max(...rows.map((r) => r.value))
    const top = 150
    const bottom = 424
    const pitch = (bottom - top) / rows.length
    const parts = []

    rows.forEach((row, i) => {
        const yc = top + pitch * (i + 0.5) - 8
        const w = (row.value / max) * BAR_MAX
        const y = yc - BAR_H / 2
        const color = row.critical ? CRITICAL : SERIES

        // category label — text ink, never the series colour
        parts.push(
            `<text x="${LABEL_R}" y="${yc + 6}" text-anchor="end" font-family="${SANS}" font-size="18" fill="${INK}">${esc(row.label)}</text>`
        )
        // the bar: filled, or outlined when the row is not a like-for-like
        // comparison with the others (Pulse's unranked baseline)
        parts.push(
            row.outlined
                ? `<path d="${barPath(BAR_X, y, w, BAR_H)}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="1.5"/>`
                : `<path d="${barPath(BAR_X, y, w, BAR_H)}" fill="${color}"/>`
        )
        // value, direct-labelled at the data end
        parts.push(
            `<text x="${BAR_X + w + 14}" y="${yc + 7}" font-family="${MONO}" font-size="19" fill="${INK}">${esc(row.value.toLocaleString('en-US'))}<tspan font-size="14" fill="${INK_2}"> ${esc(unit)}</tspan></text>`
        )
        // what happened — the status never rests on the colour alone
        parts.push(
            `<text x="${BAR_X}" y="${y + BAR_H + 20}" font-family="${SANS}" font-size="14.5" fill="${row.critical ? CRITICAL : INK_3}">${esc(row.note)}</text>`
        )
    })

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<rect width="${W}" height="${H}" fill="${SURFACE}"/>
<text x="40" y="54" font-family="${SANS}" font-size="25" font-weight="600" fill="${INK}">${esc(title)}</text>
<text x="40" y="84" font-family="${SANS}" font-size="15.5" fill="${INK_2}">${esc(subtitle)}</text>
<line x1="${BAR_X - 0.5}" y1="140" x2="${BAR_X - 0.5}" y2="${434}" stroke="${RULE}" stroke-width="1"/>
${parts.join('\n')}
<text x="40" y="474" font-family="${SANS}" font-size="14.5" fill="${INK_3}">${esc(footnote)}</text>
</svg>
`
}

// ── DATA — Flux ────────────────────────────────────────────────────────────
// 200 simultaneous transfers against funds for only 100, four concurrency
// strategies. Correct behaviour is 100 transfers posted and no overdraft.
const flux = chart({
    title: 'The fastest strategy is the broken one',
    subtitle: 'Flux · 200 simultaneous transfers against funds for 100 · throughput',
    unit: 'tps',
    rows: [
        {
            label: 'naive read-modify-write',
            value: 453,
            critical: true,
            note: '✗ overdrew ₹220 — 122 transfers posted',
        },
        { label: 'SELECT … FOR UPDATE', value: 375, note: '✓ exactly 100 posted' },
        { label: 'optimistic versioning', value: 91, note: '✓ exactly 100 posted · 938 retries' },
        { label: 'SERIALIZABLE', value: 77, note: '✓ exactly 100 posted · 1,082 retries' },
    ],
    footnote: 'Correctness costs 1.2×–5.9× throughput. Double-entry held through the failing run — the global sum stayed 0.',
    desc: 'Horizontal bar chart of throughput for four concurrency-control strategies under 200 simultaneous transfers against funds for 100. Naive read-modify-write is fastest at 453 tps but overdraws the account by 220 rupees, posting 122 transfers. SELECT FOR UPDATE reaches 375 tps, optimistic versioning 91 tps with 938 retries, and SERIALIZABLE 77 tps with 1,082 retries — each posting exactly 100.',
})

// ── DATA — Pulse ───────────────────────────────────────────────────────────
// Measured on 5,000 users / 633,422 follows / 300,000 posts / 400,000 likes.
// The chronological row is the README's own counter-argument and is drawn
// outlined because it is not the same product as the other two: it is unranked.
const pulse = chart({
    title: 'The cache earns its place only because the feed is ranked',
    subtitle: 'Pulse · feed latency p50 · 5,000 users · 633,422 follows · 300,000 posts',
    unit: 'ms',
    rows: [
        {
            label: 'chronological join',
            value: 44,
            outlined: true,
            note: 'no ranking at all — the honest baseline',
        },
        { label: 'hybrid, warm cache', value: 74, note: 'ranked · 92 ms at p95' },
        { label: 'ranked per request', value: 635, note: '8.6× slower at p50, 11.2× at p95' },
    ],
    footnote: 'The hybrid path stays flat as the corpus grows 6×; the per-request path degrades 6.5×.',
    desc: 'Horizontal bar chart of feed latency at p50. A plain chronological join answers in 44 ms but applies no ranking. The hybrid warm cache answers a ranked feed in 74 ms, 92 ms at p95. Computing the same ranking per request takes 635 ms, 8.6 times slower at p50 and 11.2 times slower at p95.',
})

writeFileSync(join(OUT, 'project-flux-concurrency.svg'), flux)
writeFileSync(join(OUT, 'project-pulse-latency.svg'), pulse)
console.log('wrote public/project-flux-concurrency.svg, public/project-pulse-latency.svg')
