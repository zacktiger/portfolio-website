import { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { motion, useScroll, useSpring, useMotionValue, useReducedMotion } from 'framer-motion'

/*
 * SectionPath — a colorful "route" that threads down the page, connecting
 * every section with one continuous glowing ribbon. The line is measured
 * against the real section positions (#home … #contact), so it curves left
 * and right to pass through the vertical centre of each one, dropping a
 * glowing waypoint node on the way. The coloured stroke draws itself as you
 * scroll (Framer Motion `useScroll` → `pathLength`, same idea as
 * ScrollProgress), and each node lights up as it crosses the screen centre.
 *
 * It sits at z-2: above the ambient PixelModels floaters, behind the content.
 * Everything is pointer-events:none and aria-hidden — purely decorative.
 */

// Anchors to route through (kept in sync with Navbar's navItems / section ids)
const SECTION_IDS = ['home', 'about', 'skills', 'projects', 'github', 'writing', 'contact']

// One hue per node, sampled down the same ramp as the gradient below so a
// node's colour matches the ribbon where it sits.
const NODE_COLORS = ['#00d4ff', '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fbbf24', '#34d399']

// Smooth spline through points using a Catmull-Rom → cubic-bezier conversion.
// Gives soft, auto-tangented curves as the route weaves side to side.
function buildPath(pts) {
    if (pts.length < 2) return ''
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[i + 2] || pts[i + 1]
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
}

export default function SectionPath() {
    const prefersReduced = useReducedMotion()
    const [enabled, setEnabled] = useState(false) // desktop only — no room in mobile gutters
    const [layout, setLayout] = useState(null) // { w, h, d, nodes }
    const [litCount, setLitCount] = useState(0) // how many nodes have crossed centre
    const rafRef = useRef(0)

    const { scrollYProgress } = useScroll()
    const drawn = useSpring(scrollYProgress, { stiffness: 80, damping: 30, restDelta: 0.001 })

    // The coloured ribbon is drawn from `floor` (a bit past the hero) up to 1 as
    // you scroll, so it's already threaded through the hero at rest instead of
    // appearing only once you start scrolling. `floor` is derived from the route
    // geometry in measure() so it stays correct if the page height changes.
    const pathLen = useMotionValue(1)
    const floorRef = useRef(0.12)

    // Only render where there are side gutters to hold the route (matches the
    // dock nav / PixelModels, both hidden below 768px).
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)')
        const update = () => setEnabled(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    // Measure the page and build the route through each section's centre.
    useLayoutEffect(() => {
        const measure = () => {
            const w = document.documentElement.clientWidth
            const h = document.documentElement.scrollHeight
            if (!w || !h) return

            const cx = w / 2
            // Swing the route out toward the gutters so waypoints sit beside the
            // content, not on it — while staying clear of the right-edge dock nav.
            const amp = Math.min(w * 0.4, w / 2 - 90)

            const nodes = SECTION_IDS.map((id, i) => {
                const el = document.getElementById(id)
                const rect = el?.getBoundingClientRect()
                const y = rect
                    ? rect.top + window.scrollY + rect.height / 2
                    : (h / SECTION_IDS.length) * (i + 0.5)
                const dir = i % 2 === 0 ? -1 : 1
                return { x: cx + dir * amp, y, color: NODE_COLORS[i % NODE_COLORS.length] }
            })

            // Anchor the ribbon to the very top and bottom of the page so it
            // reads as one uninterrupted thread, not a floating segment.
            const pathPts = [{ x: nodes[0].x, y: 0 }, ...nodes, { x: nodes[nodes.length - 1].x, y: h }]

            // Rest-state draw amount: the fraction of the route that reaches the
            // bottom of the hero, so the hero always shows a coloured segment.
            // Approximated from the waypoint polyline length (close enough for a
            // starting offset; the true arc scales the same way).
            const homeEl = document.getElementById('home')
            const heroBottom = homeEl ? homeEl.offsetTop + homeEl.offsetHeight : window.innerHeight
            let total = 0
            const segLen = []
            for (let i = 0; i < pathPts.length - 1; i++) {
                const l = Math.hypot(pathPts[i + 1].x - pathPts[i].x, pathPts[i + 1].y - pathPts[i].y)
                segLen.push(l)
                total += l
            }
            const target = Math.min(heroBottom, h)
            let acc = 0
            let lenAtHero = 0
            for (let i = 0; i < pathPts.length - 1; i++) {
                const y0 = pathPts[i].y
                const y1 = pathPts[i + 1].y
                if (y1 >= target) {
                    const t = Math.max(0, Math.min(1, (target - y0) / Math.max(y1 - y0, 1)))
                    lenAtHero = acc + segLen[i] * t
                    break
                }
                acc += segLen[i]
                lenAtHero = acc
            }
            const floor = total > 0 ? Math.min(Math.max(lenAtHero / total, 0.06), 0.25) : 0.12
            floorRef.current = floor
            if (!prefersReduced) pathLen.set(floor + drawn.get() * (1 - floor))

            setLayout({ w, h, d: buildPath(pathPts), nodes })
        }

        const schedule = () => {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = requestAnimationFrame(measure)
        }

        measure()
        window.addEventListener('resize', schedule)
        window.addEventListener('load', schedule)
        // Layout height shifts as images/fonts settle — re-measure when it does.
        const ro = new ResizeObserver(schedule)
        ro.observe(document.body)

        return () => {
            cancelAnimationFrame(rafRef.current)
            window.removeEventListener('resize', schedule)
            window.removeEventListener('load', schedule)
            ro.disconnect()
        }
    }, [])

    // Map the scroll spring (0 → 1) onto the ribbon draw (floor → 1) so the
    // hero starts already drawn. Reduced motion pins it fully drawn.
    useEffect(() => {
        if (prefersReduced) {
            pathLen.set(1)
            return
        }
        const apply = (v) => pathLen.set(floorRef.current + v * (1 - floorRef.current))
        apply(drawn.get())
        return drawn.on('change', apply)
    }, [prefersReduced, drawn, pathLen])

    // Light nodes as their section crosses the vertical centre of the viewport.
    useEffect(() => {
        if (!layout) return
        const onScroll = () => {
            const centre = window.scrollY + window.innerHeight / 2
            let count = 0
            for (const n of layout.nodes) {
                if (centre >= n.y) count++
            }
            setLitCount(count)
        }
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [layout])

    if (!enabled || !layout) return null

    const { w, h, d, nodes } = layout
    // Drawn from `floor` (hero already showing) up to 1 with scroll; pinned at 1
    // for reduced motion. See the effects above.
    const pathLength = pathLen

    return (
        <div
            className="absolute left-0 top-0 pointer-events-none"
            style={{ width: w, height: h, zIndex: 2 }}
            aria-hidden="true"
        >
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ display: 'block' }}>
                <defs>
                    <linearGradient id="section-path-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={h}>
                        <stop offset="0" stopColor="#00d4ff" />
                        <stop offset="0.16" stopColor="#38bdf8" />
                        <stop offset="0.33" stopColor="#818cf8" />
                        <stop offset="0.5" stopColor="#c084fc" />
                        <stop offset="0.66" stopColor="#f472b6" />
                        <stop offset="0.83" stopColor="#fbbf24" />
                        <stop offset="1" stopColor="#34d399" />
                    </linearGradient>
                </defs>

                {/* Faint full route — the "track" the coloured ribbon draws over */}
                <path d={d} stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} strokeLinecap="round" />

                {/* Layered translucent strokes fake a soft bloom without a filter
                    (cheap on a full-page-tall SVG). All share the scroll draw. */}
                <motion.path d={d} stroke="url(#section-path-grad)" strokeWidth={10} strokeLinecap="round" opacity={0.1} style={{ pathLength }} />
                <motion.path d={d} stroke="url(#section-path-grad)" strokeWidth={5} strokeLinecap="round" opacity={0.28} style={{ pathLength }} />
                <motion.path d={d} stroke="url(#section-path-grad)" strokeWidth={2.5} strokeLinecap="round" opacity={0.95} style={{ pathLength }} />

                {/* Waypoint nodes */}
                {nodes.map((n, i) => {
                    const lit = i < litCount
                    return (
                        <g key={SECTION_IDS[i]} style={{ transition: 'opacity 0.5s ease' }}>
                            {/* soft glow blob */}
                            <circle
                                cx={n.x} cy={n.y} r={14} fill={n.color}
                                className={lit ? 'section-path-halo' : undefined}
                                style={{ opacity: lit ? 0.16 : 0.05, transition: 'opacity 0.6s ease' }}
                            />
                            {/* ring */}
                            <circle
                                cx={n.x} cy={n.y} r={6} fill="none" stroke={n.color} strokeWidth={1.5}
                                style={{ opacity: lit ? 0.9 : 0.3, transition: 'opacity 0.5s ease' }}
                            />
                            {/* core */}
                            <circle
                                cx={n.x} cy={n.y} r={3} fill={n.color}
                                style={{ opacity: lit ? 1 : 0.45, transition: 'opacity 0.5s ease' }}
                            />
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}
