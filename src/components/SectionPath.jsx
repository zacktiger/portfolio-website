import { useRef, useState, useEffect, useLayoutEffect, useCallback, lazy, Suspense, Component } from 'react'
import { motion, useScroll, useSpring, useMotionValue, useReducedMotion } from 'framer-motion'

// three.js car in its own chunk — keeps three off the initial bundle (like PixelModels)
const PathCarModel = lazy(() => import('./PathCarModel'))

/*
 * SectionPath — a colorful "route" that threads down the page, connecting
 * every section with one continuous glowing ribbon, with a little car that
 * rides down the route as you scroll.
 *
 * The line is measured against the real section positions (#home … #contact),
 * so it curves left and right to pass through each one, dropping glowing
 * waypoint nodes on the way. The coloured stroke
 * draws itself up to the car (Framer Motion `useScroll`), so the car looks like
 * it's laying the trail behind it.
 *
 * The car's progress along the path is keyed to those nodes: scrolling drives
 * it from one to the next, and it *dwells* at each node (a flat spot in the
 * scroll→progress map) with an arrival burst. Reversing the scroll makes it hop
 * and flip 180° to face the new direction.
 *
 * Two rules keep the route's rhythm tied to the page's rhythm rather than to
 * its pixel height, and both exist because breaking them looked broken:
 * waypoints are spaced by DISTANCE, not one per section (see MAX_NODE_GAP), and a
 * dwell is capped in pixels (see MAX_DWELL_PX) so the car can never idle its way
 * off the top of the viewport.
 *
 * It sits at z-2: above the ambient PixelModels floaters, behind the content.
 * Everything is pointer-events:none and aria-hidden — purely decorative.
 */

// Sections to route through (kept in sync with Navbar's navItems / section ids).
// The route swings from one side to the other BETWEEN these, which is safe only
// because every section carries vertical padding for the swing to cross.
const SECTION_IDS = ['home', 'about', 'skills', 'projects', 'github', 'writing', 'contact']

/*
 * How far apart waypoints may be, in pixels of page.
 *
 * A waypoint per section put one node in the middle of #projects — six screens
 * tall — so the car ran 5,190px dead straight with a single dot on it, while
 * the three short sections above it got a waypoint every 900px. The rhythm of
 * the route had nothing to do with the rhythm of the page.
 *
 * A tall section is therefore subdivided into several waypoints ALONG ITS OWN
 * RAIL, at the same x. The tempting fix — giving the featured track and the
 * archive a route stop each — is worse: a stop is a thing the route swings
 * around, and those two boxes butt straight up against each other's content
 * with no padding between them, so the swing crossed the "Projects / built."
 * heading on the way in and the last row of archive cards on the way out.
 * Subdividing adds the missing beats without adding a single crossing.
 */
const MAX_NODE_GAP = 1600

// The hue ramp the nodes and the ribbon share, so a node's colour matches the
// ribbon where it sits. Sampled by position down the page, not by index, since
// there are more nodes than sections.
const NODE_COLORS = [
    '#00d4ff', '#38bdf8', '#818cf8', '#a78bfa',
    '#c084fc', '#f472b6', '#fbbf24', '#34d399',
]

// .content-container's max-width and its horizontal padding formula — the
// route has to clear the text these produce, so they have to match.
const CONTENT_MAX = 1100
const CONTENT_PAD = (w) => clamp(w * 0.05, 24, 80)

/*
 * The longest a dwell may last, in pixels of scroll.
 *
 * The car freezes in DOCUMENT space while it dwells at a node, so every pixel
 * of dwell is a pixel it slides UP the viewport. The dwell used to be a flat
 * 28% of the gap to the nearest neighbouring node, which is fine between two
 * 900px sections and catastrophic around #projects: the gap there was ~3,200px,
 * so the car sat still for 896px of scroll on each side of the node — it left
 * the top of a 900px viewport entirely, then raced back down to catch up. A
 * dwell is a beat, not a stop, so it gets an absolute ceiling. 110px also
 * keeps the catch-up afterwards under ~1.3x scroll speed on the tightest gap
 * between two waypoints (1,000px), which reads as the car pulling away from a
 * stop rather than as it teleporting.
 */
const MAX_DWELL_PX = 110

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/*
 * What a crossing is allowed to touch.
 *
 * A swing from one gutter to the other has to cross the reading column, and it
 * is only ever allowed to do that through the empty band between two sections
 * — which is each section's own vertical padding, measured, plus whatever the
 * divider leaves between them.
 *
 *   CROSS_MARGIN  how far inside that band the crossing keeps clear of the
 *                 first and last line of content it passes between.
 *   MIN_CLEAR     the floor on a section's contribution to the band when it
 *                 declares no padding of its own (the hero). 104px is what the
 *                 route already assumed for every section, padded or not.
 *   MIN_BAND_HALF a floor on the swing's half-height. At a boundary with
 *                 almost no empty band, obeying it exactly would mean a
 *                 horizontal jolt; clipping the outermost line of content by a
 *                 few px is the better failure of the two.
 */
const CROSS_MARGIN = 20
const MIN_CLEAR = 104
const MIN_BAND_HALF = 96

/*
 * The lane the ribbon rides, and the drift down it.
 *
 * LANE_BIAS keeps the ribbon's average position toward the outer edge of the
 * lane for the reason the fixed rail did (a card occludes it; body copy must
 * not) — the drift is then whatever symmetric swing still fits either side of
 * that, so it grows on a wide screen and vanishes on a narrow one instead of
 * ever spending clearance it does not have. DRIFT_LEN is a wavelength in page
 * pixels: long enough that a viewport sees most of one bow, so the straights
 * read as drawn rather than as ruled.
 */
const LANE_BIAS = 0.72
const DRIFT_LEN = 1800

// How far apart Bézier segments are cut down a straight. A swing is cut into
// eight regardless of how tall it is (see the sampling loop).
const RAIL_STEP = 220
/*
 * ── The route is a function, not a list of points ──────────────────────────
 *
 *   x(y) = cx + side(y) · lane(y)
 *
 *   side(y) ∈ [−1, +1] — which gutter the ribbon is riding. It holds at ±1
 *     through a section and eases to the other side across a boundary, so a
 *     crossing GROWS out of the straight and settles back into the next one.
 *     That is the whole fix: the route used to be a point list smoothed by
 *     Catmull-Rom with every control point clamped into its own segment's
 *     bounding box, which held the rails dead vertical but made the tangent
 *     jump from 0° to 62° in a single step at both ends of every crossing —
 *     twelve corners down the page, each reading as the ribbon hitting
 *     something and turning rather than as a line that curves.
 *   lane(y) — how far out into that gutter, drifting slowly between the text
 *     edge and the dock so a straight is never dead straight.
 *
 * Because it is analytic the exact slope x'(y) is known at every y, which is
 * what lets buildPath() emit curves that reproduce this shape instead of
 * inferring tangents from neighbouring points. No clamping, and no corners.
 */

/*
 * The crossing's easing: smootherstep, 6u⁵ − 15u⁴ + 10u³.
 *
 * Its first AND second derivatives are zero at both ends, so a swing leaves
 * the straight with zero curvature as well as zero slope — the ribbon opens
 * out of the rail rather than bending off it. The obvious alternative, a
 * raised cosine, also meets the rail at zero slope but arrives with its
 * curvature at maximum, which put the tightest bend of the whole route (a
 * ~54px radius) exactly at the point where the eye is following a straight
 * line. Smootherstep moves the tightest bend into the middle of the swing,
 * where the ribbon is already leaning over, and opens it to ~99px.
 *
 * It pays for that with a faster middle (peak 1.875 across the swing against
 * the cosine's 1.571), which costs nothing here: the swing is sized by how
 * long it spends over the text column, and a faster middle spends LESS.
 */
const ease = (u) => u * u * u * (u * (u * 6 - 15) + 10)
const easeSlope = (u) => 30 * u * u * (u - 1) * (u - 1)

function makeRoute({ cx, laneMid, laneAmp, laneFreq, startSide, bands }) {
    const lane = (y) => laneMid + laneAmp * Math.cos(y * laneFreq)
    const laneSlope = (y) => -laneAmp * laneFreq * Math.sin(y * laneFreq)

    // Crossings are SUMMED rather than looked up, so two bands that overlap (a
    // short section between two boundaries) blend instead of fighting. An
    // earlier step is always at least as far along as a later one, so the sum
    // stays inside [−1, +1] and the ribbon can never leave its gutter.
    const side = (y) => {
        let s = startSide
        for (const b of bands) {
            if (y <= b.c - b.T) continue
            if (y >= b.c + b.T) {
                s += b.to - b.from
                continue
            }
            s += (b.to - b.from) * ease((y - (b.c - b.T)) / (2 * b.T))
        }
        return s
    }
    const sideSlope = (y) => {
        let m = 0
        for (const b of bands) {
            if (y <= b.c - b.T || y >= b.c + b.T) continue
            m += ((b.to - b.from) * easeSlope((y - (b.c - b.T)) / (2 * b.T))) / (2 * b.T)
        }
        return m
    }

    return {
        x: (y) => cx + side(y) * lane(y),
        // Product rule: the drift keeps adding its own gentle tilt through a
        // crossing, so the swing and the straight share a tangent at the join.
        slope: (y) => sideSlope(y) * lane(y) + side(y) * laneSlope(y),
    }
}

/*
 * How much of a swing is spent over the reading column — the only part of it
 * that has to fit inside the empty band between two sections.
 *
 * Measured rather than solved. The closed form exists for a given easing (for
 * a raised cosine it is 1 − (2/π)·acos(textHalf/lane)) but it has to be redone
 * for every change to the curve, and it can't see the lane drift at all.
 * Sampling the route it will actually draw costs ~160 evaluations of a couple
 * of trig calls, once per band per measure.
 */
function overTextSpan(route, band, cx, textHalf) {
    const N = 160
    let first = null
    let last = null
    for (let i = 0; i <= N; i++) {
        const y = band.c - band.T + (2 * band.T * i) / N
        if (Math.abs(route.x(y) - cx) < textHalf) {
            if (first === null) first = y
            last = y
        }
    }
    return first === null ? 0 : last - first
}

/*
 * Sample the route into cubic Béziers that pass through it with the right
 * tangents — a Hermite segment written as a Bézier: each control point sits a
 * third of the way along in y, offset in x by the true slope at that end.
 *
 * The four y values of a segment are evenly spaced by construction, so y(t) is
 * LINEAR in t and the route can never backtrack vertically — which is exactly
 * what the length↔y inversion in the geometry effect assumes. Clamping the
 * control points used to buy that guarantee at the cost of the corners; here
 * it falls out of the construction for free.
 */
function buildPath(ys, route) {
    if (ys.length < 2) return ''
    let d = `M ${route.x(ys[0]).toFixed(1)} ${ys[0].toFixed(1)}`
    for (let i = 0; i < ys.length - 1; i++) {
        const y0 = ys[i]
        const y1 = ys[i + 1]
        const h = (y1 - y0) / 3
        const x1 = route.x(y1)
        const c1x = route.x(y0) + route.slope(y0) * h
        const c2x = x1 - route.slope(y1) * h
        d += ` C ${c1x.toFixed(1)} ${(y0 + h).toFixed(1)} ${c2x.toFixed(1)} ${(y1 - h).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`
    }
    return d
}

/*
 * ───────────────────────────────────────────────────────────────────────────
 * Placeholder car — a simple top-view SVG so the motion/effects are reviewable.
 * SWAP POINT: replace this component's body with the real 3D model, e.g. an
 * @react-three/fiber <Canvas> loading `/car.glb` (drei's useGLTF). Keep it
 * pointing along +X (nose to the right) at rest; the rig rotates it to the
 * path tangent. Nothing else in this file needs to change.
 * ───────────────────────────────────────────────────────────────────────────
 */
// If the 3D car fails to load (missing glb, WebGL off), fall back to the SVG.
class CarBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { failed: false }
    }
    static getDerivedStateFromError() {
        return { failed: true }
    }
    render() {
        if (this.state.failed) return this.props.fallback
        return this.props.children
    }
}

function CarGraphic() {
    return (
        <svg width="48" height="28" viewBox="0 0 48 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="path-car-body" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#5fe6ff" />
                    <stop offset="1" stopColor="#0787c4" />
                </linearGradient>
            </defs>
            {/* wheels */}
            <rect x="12" y="1.5" width="9" height="4" rx="1.5" fill="#0c0c0c" />
            <rect x="12" y="22.5" width="9" height="4" rx="1.5" fill="#0c0c0c" />
            <rect x="30" y="1.5" width="9" height="4" rx="1.5" fill="#0c0c0c" />
            <rect x="30" y="22.5" width="9" height="4" rx="1.5" fill="#0c0c0c" />
            {/* body */}
            <rect x="3" y="4.5" width="42" height="19" rx="8" fill="url(#path-car-body)" stroke="#bff4ff" strokeWidth="1" />
            {/* cabin / roof */}
            <rect x="14" y="8" width="16" height="12" rx="4" fill="#0a2a37" opacity="0.85" />
            {/* windshield tint toward the nose */}
            <path d="M30 9 L34 12 L34 16 L30 19 Z" fill="#0a2a37" opacity="0.7" />
            {/* headlights at the front (right) */}
            <rect x="43.5" y="8" width="2.5" height="3.5" rx="1" fill="#eafcff" />
            <rect x="43.5" y="16.5" width="2.5" height="3.5" rx="1" fill="#eafcff" />
        </svg>
    )
}

export default function SectionPath() {
    const prefersReduced = useReducedMotion()
    const [enabled, setEnabled] = useState(false) // desktop only — no room in mobile gutters
    const [layout, setLayout] = useState(null) // { w, h, d, nodes }
    const [litCount, setLitCount] = useState(0) // how many nodes the car has reached
    const [burst, setBurst] = useState(null) // { i, key } — arrival effect at node i
    const rafRef = useRef(0)

    const { scrollYProgress } = useScroll()
    const drawn = useSpring(scrollYProgress, { stiffness: 80, damping: 30, restDelta: 0.001 })

    // Fraction (0→1) of the route drawn / travelled. Drives both the ribbon
    // draw and the car position; kept in sync in updateCar().
    const carProgress = useMotionValue(0)

    // Path geometry, recomputed on measure: total length, each node's length
    // fraction, and the scroll→progress keyframes (with dwell flats at nodes).
    const geomRef = useRef(null)
    const pathRef = useRef(null)

    // Car DOM layers (transformed imperatively so scrolling never re-renders):
    //   pos → point on path | hop → screen-space jump | spin → path tangent |
    //   flip → 0/180 heading
    const carPosRef = useRef(null)
    const carHopRef = useRef(null)
    const carSpinRef = useRef(null)
    const carFlipRef = useRef(null)
    const headingRef = useRef(1) // 1 = forward (down-path), -1 = reversed
    const arrivedRef = useRef(-1) // last node the car "arrived" at
    const litCountRef = useRef(0) // last lit-node count pushed to state (dedupes renders)
    const lastYRef = useRef(null) // last page position, for deadzoned heading changes
    const carAngleRef = useRef(null) // eased heading, so the car turns into corners
    // Target orientation handed to the 3D rig (PathCarModel eases toward it each
    // frame): yaw = steer heading (world radians), bank = lean into the bend.
    const carDriveRef = useRef({ yaw: 0, bank: 0, pitch: 0 })

    // Only render where there are side gutters to hold the route (matches the
    // dock nav / PixelModels, both hidden below 768px).
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)')
        const update = () => setEnabled(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    // scroll-progress value → document y, via the node keyframes (flat spots make
    // the car dwell at each node). updateCar turns that y into a point on the
    // route.
    const remap = useCallback((v) => {
        const g = geomRef.current
        if (!g) return v
        const { xs, ys } = g
        if (v <= xs[0]) return ys[0]
        if (v >= xs[xs.length - 1]) return ys[ys.length - 1]
        for (let i = 1; i < xs.length; i++) {
            if (v <= xs[i]) {
                const t = (v - xs[i - 1]) / (xs[i] - xs[i - 1])
                return ys[i - 1] + (ys[i] - ys[i - 1]) * t
            }
        }
        return ys[ys.length - 1]
    }, [])

    // Replay the hop keyframe (used on reverse).
    const triggerHop = useCallback(() => {
        const hop = carHopRef.current
        if (!hop) return
        hop.classList.remove('path-car__hop--go')
        void hop.offsetWidth // restart the animation
        hop.classList.add('path-car__hop--go')
    }, [])

    // Position + orient the car at document position y. This is the single source
    // of truth for everything keyed to the car: it also lights the nodes the car
    // has reached, flips the car to face its travel direction, and fires an
    // arrival burst — all from the same y, so nothing drifts out of sync with the
    // car. (Lighting and the flip used to be driven off raw scrollY, which ran
    // ahead of the spring-smoothed car.)
    //
    // y is a page coordinate, not a route fraction: see the sample table in the
    // geometry effect for why the car is driven down the page rather than along
    // the stroke. The fraction is derived here, and only here.
    const updateCar = useCallback((y) => {
        const g = geomRef.current
        const pathEl = pathRef.current
        const pos = carPosRef.current
        const spin = carSpinRef.current
        if (!g || !pathEl || !pos || !spin) return

        const t = g.fractionAtY(y)
        carProgress.set(t)

        // Sit the car a little AHEAD of the drawn ribbon tip (which ends at t)
        // along its heading, so the trail ends at the car's tail and it looks like
        // it's pulling the trail rather than sitting on top of it.
        const LEAD = 20
        const L = clamp(t * g.total + LEAD * headingRef.current, 0, g.total)
        const p = pathEl.getPointAtLength(L)
        // Wider look-ahead window → a smoother, anticipatory tangent through curves.
        const a = pathEl.getPointAtLength(Math.min(L + 7, g.total))
        const b = pathEl.getPointAtLength(Math.max(L - 7, 0))
        const target = (Math.atan2(a.y - b.y, a.x - b.x) * 180) / Math.PI
        // Ease the heading toward the tangent (shortest way round) so the car
        // steers into turns instead of snapping to the new direction.
        let cur = carAngleRef.current
        if (cur === null) cur = target
        const delta = ((target - cur + 540) % 360) - 180
        cur += delta * 0.18
        carAngleRef.current = cur
        pos.style.transform = `translate(${p.x}px, ${p.y}px)`
        // spin only centres the car on the path point now — the heading is applied
        // in 3D by the rig (carDriveRef below), so the model turns and banks
        // instead of the flat canvas spinning.
        spin.style.transform = 'translate(-50%, -50%)'

        // Detect a scroll-direction reversal (car faces back down the route) and
        // trigger the hop, from the car's own motion. A small deadzone ignores
        // spring jitter; the car doesn't move during a node dwell so it won't
        // spuriously flip there either.
        if (!prefersReduced) {
            const prevY = lastYRef.current
            if (prevY === null) {
                lastYRef.current = y
            } else if (Math.abs(y - prevY) > 1.5) {
                const dir = y > prevY ? 1 : -1
                if (dir !== headingRef.current) {
                    headingRef.current = dir
                    triggerHop()
                }
                lastYRef.current = y
            }
        }

        // Feed the 3D rig: yaw = eased screen heading mapped to model yaw (plus a
        // half-turn when reversing), bank = lean proportional to how hard the car
        // is turning into the bend (its heading error). Signs/gain match the
        // tilted camera in PathCarModel.
        const DEG = Math.PI / 180
        const drive = carDriveRef.current
        drive.yaw = -cur * DEG + (headingRef.current === -1 ? Math.PI : 0)
        drive.bank = prefersReduced ? 0 : clamp(-delta * DEG * 2.2, -0.32, 0.32)

        // Light every node the car has reached (keyed to the same y that positions
        // it), so a waypoint lights exactly as the car arrives.
        let count = 0
        for (let i = 0; i < g.nodeYs.length; i++) if (y >= g.nodeYs[i]) count++
        if (count !== litCountRef.current) {
            litCountRef.current = count
            setLitCount(count)
        }

        // arrival: nearest node within a fixed window down the page. In pixels,
        // not in route fraction — a fraction window is worth wildly different
        // distances in a crossing than in a straight.
        let nearest = -1
        let best = 130
        for (let i = 0; i < g.nodeYs.length; i++) {
            const dd = Math.abs(g.nodeYs[i] - y)
            if (dd < best) {
                best = dd
                nearest = i
            }
        }
        if (nearest !== arrivedRef.current) {
            arrivedRef.current = nearest
            if (nearest !== -1) setBurst({ i: nearest, key: performance.now() })
        }
    }, [prefersReduced, triggerHop, carProgress])

    // Measure the page and build the route through each section's centre.
    useLayoutEffect(() => {
        const measure = () => {
            const w = document.documentElement.clientWidth
            /*
             * The CONTENT height, from <body>'s own box — deliberately not
             * `documentElement.scrollHeight`.
             *
             * This overlay is absolutely positioned and as tall as the page, so
             * it does not affect <body>'s layout height but it DOES count toward
             * the document's scrollable overflow. Measuring scrollHeight there-
             * fore fed this element's own height back into the size we give it,
             * and the loop only ever ratchets upward: any transient spike (the
             * archive grid reflowing under `layout` animations while filtering
             * is enough) gets latched in, and scrollHeight can never fall back
             * below it because the overlay is now that tall. Observed live:
             * 10,790px → 17,997px after four filter clicks, leaving ~7,200px of
             * dead scroll under the footer and finishing the car's route at 55%.
             *
             * <body>'s border-box excludes its absolutely-positioned descendants,
             * so it is the one measurement here that this component cannot
             * influence.
             */
            const h = document.body.offsetHeight
            if (!w || !h) return

            const cx = w / 2
            /*
             * Swing the route out into the gutter — the lane between the text
             * column and the dock nav.
             *
             * `lo` is the nearest the ribbon may come to the reading column:
             * .content-container's box is capped at CONTENT_MAX and then
             * padded, so the text stops well short of the box edge, and it is
             * the text that matters. `hi` is the furthest out it may go before
             * it runs under the dock nav (58px wide, 24px off the right edge).
             *
             * The old rule was `min(w*0.4, w/2 − 130)`, which knew about the
             * dock but nothing about the text: at 1024px it put the ribbon 79px
             * INSIDE the reading column. Bias toward `hi` because a featured
             * card is opaque and simply occludes the ribbon behind it, whereas
             * running over body copy is always wrong. Where the two constraints
             * cross (below ~1100px there is no clean lane), clearing the text
             * wins and the ribbon slides behind the dock instead.
             */
            const textHalf = Math.min(CONTENT_MAX, w) / 2 - CONTENT_PAD(w)
            const lo = textHalf + 28
            const hi = w / 2 - 108

            /*
             * The lane is a band, not a line: the ribbon rides its middle and
             * drifts slowly across it, so a straight bows the way a drawn line
             * does instead of ruling itself against an invisible edge. The
             * drift is bounded by the same `lo`/`hi` the fixed rail obeyed, so
             * it can reach neither the text nor the dock; where there is no
             * lane at all it collapses to zero and the rail is straight again.
             */
            const laneMid = hi > lo ? lo + (hi - lo) * LANE_BIAS : Math.min(lo, w / 2 - 40)
            const laneAmp = hi > lo ? Math.min(laneMid - lo, hi - laneMid) * 0.9 : 0
            const laneFreq = (2 * Math.PI) / DRIFT_LEN

            /*
             * A section's own padding IS its empty band, and it is bigger than
             * the route used to assume: 144px on about/skills/projects, 128 on
             * github/writing, 176 on contact, against the flat 104 the old rail
             * points guessed at. Measuring it (rather than guessing) is worth
             * ~40% more room for a crossing to happen in — the difference
             * between a swerve and a curve. The hero declares none, so
             * MIN_CLEAR keeps it at the 104 the route already used there.
             */
            const fallbackH = h / SECTION_IDS.length
            const sections = SECTION_IDS.map((id, i) => {
                const el = document.getElementById(id)
                const rect = el?.getBoundingClientRect()
                const cs = el ? getComputedStyle(el) : null
                const top = rect ? rect.top + window.scrollY : fallbackH * i
                const height = rect ? rect.height : fallbackH
                const clear = (v) => clamp(Math.max(parseFloat(v) || 0, MIN_CLEAR), 0, height / 2 - 1)
                return {
                    top,
                    height,
                    dir: i % 2 === 0 ? -1 : 1,
                    clearTop: clear(cs?.paddingTop),
                    clearBot: clear(cs?.paddingBottom),
                }
            })

            const yStart = 0
            const lastSection = sections[sections.length - 1]
            const yEnd = lastSection.top + lastSection.height / 2

            /*
             * How tall a crossing may be.
             *
             * Only the MIDDLE of a swing is over the text column — its ends are
             * out in the gutter, where the ribbon is free at any y. So the
             * empty band between two sections does not cap the whole swing,
             * only the part of it that is over text, and the rest can spill as
             * far into both sections as it likes.
             *
             * That is worth about twice the room: at 1440px a 325px gap carries
             * a ~600px swing, against the 277px the old rail points allowed.
             * Same clearance over the same text, and the steepest point of a
             * crossing drops from ~5px sideways per px down to ~3.5.
             *
             * The swing is fitted rather than solved: start with the whole band
             * over text (always too small), measure what the route actually
             * spends over the column, and scale. The span is very nearly linear
             * in T, so this lands within a pixel or two in three passes. `capT`
             * keeps a swing from reaching its neighbour, so each one converges
             * on its own gap without the fit having to consider the others.
             */
            const bands = []
            for (let i = 0; i < sections.length - 1; i++) {
                const a = sections[i]
                const b = sections[i + 1]
                const from = a.top + a.height - a.clearBot
                const to = b.top + b.clearTop
                bands.push({
                    c: (from + to) / 2,
                    T: 0,
                    budget: Math.max(to - from - CROSS_MARGIN * 2, 40),
                    from: a.dir,
                    to: b.dir,
                })
            }
            // Leave every section a stretch of settled rail between its two
            // swings: a band that ran into its neighbour would turn a short
            // section into one continuous slalom, and the waypoints on it into
            // dots floating mid-swerve.
            //
            // Two adjacent swings split the distance between them 45/45, which
            // leaves a tenth of it straight. At the two ENDS there is no
            // neighbour to collide with — only the route's own start and stop,
            // which a swing has to be finished by — so those get 0.8. The last
            // boundary is the one that needed it: the route stops at contact's
            // centre, 455px past that swing, and capping it at 0.45 there left
            // the final crossing two thirds the size of every other one and the
            // steepest thing on the page — 5.3px sideways per px down, against
            // 3.3 for the rest.
            const capT = bands.map((b, i) => {
                const above = i > 0 ? (b.c - bands[i - 1].c) * 0.45 : (b.c - yStart) * 0.8
                const below =
                    i < bands.length - 1 ? (bands[i + 1].c - b.c) * 0.45 : (yEnd - b.c) * 0.8
                return Math.min(above, below)
            })
            bands.forEach((b, i) => {
                b.T = clamp(b.budget / 2, MIN_BAND_HALF, Math.max(capT[i], MIN_BAND_HALF))
            })

            const route = makeRoute({
                cx,
                laneMid,
                laneAmp,
                laneFreq,
                startSide: sections[0].dir,
                bands,
            })
            // The route reads these band objects live, so the fit below adjusts
            // them in place rather than rebuilding it each pass.
            for (let pass = 0; pass < 3; pass++) {
                bands.forEach((b, i) => {
                    const span = overTextSpan(route, b, cx, textHalf)
                    if (span > 1) {
                        b.T = clamp(
                            (b.T * b.budget) / span,
                            MIN_BAND_HALF,
                            Math.max(capT[i], MIN_BAND_HALF)
                        )
                    }
                })
            }

            /*
             * Where to cut the curve into Bézier segments: often through a
             * swing, sparsely down a straight. With the true slope at both ends
             * of every segment the error is a rounding difference either way —
             * this is about how much path data the four stacked strokes carry,
             * not about fidelity.
             */
            const edges = []
            bands.forEach((b) => edges.push(b.c - b.T, b.c + b.T))
            edges.sort((p, q) => p - q)
            const bandAt = (y) => bands.find((b) => y >= b.c - b.T - 0.5 && y <= b.c + b.T + 0.5)
            const ys = [yStart]
            for (let cursor = yStart, guard = 0; cursor < yEnd && guard < 4000; guard++) {
                const band = bandAt(cursor)
                const step = band ? clamp((2 * band.T) / 8, 32, 90) : RAIL_STEP
                const edge = edges.find((e) => e > cursor + 0.5)
                let next = cursor + step
                if (edge !== undefined && edge < next) next = edge
                if (next > yEnd) next = yEnd
                ys.push(next)
                cursor = next
            }

            /*
             * Visible waypoints: one per section for a normal section, several
             * spaced down it for a tall one (see MAX_NODE_GAP). They sit on the
             * settled stretch between that section's two swings, so a node
             * always marks a place the route is holding still rather than a
             * point it is sweeping through — and, sitting on the rail, it never
             * lands over the text.
             */
            const nodes = []
            sections.forEach((s, i) => {
                const before = i > 0 ? bands[i - 1] : null
                const after = i < bands.length ? bands[i] : null
                const from = Math.max(s.top, before ? before.c + before.T : yStart)
                const to = Math.min(s.top + s.height, after ? after.c - after.T : yEnd)
                const span = to - from
                if (span < 60) {
                    nodes.push({ y: clamp(s.top + s.height / 2, yStart, yEnd) })
                    return
                }
                const count = Math.max(1, Math.round(span / MAX_NODE_GAP))
                for (let k = 0; k < count; k++) {
                    nodes.push({ y: count === 1 ? (from + to) / 2 : from + (span * (k + 0.5)) / count })
                }
            })
            // The route ENDS at the last section's centre — the car arrives
            // there instead of driving on into the footer — so the last node
            // has to BE that point, or the final dwell lands short of the end.
            nodes[nodes.length - 1].y = yEnd
            nodes.forEach((n) => {
                n.x = route.x(n.y)
            })
            // Colour by position down the page so the ramp still lines up with
            // the ribbon's gradient now that nodes outnumber sections.
            const last = Math.max(nodes.length - 1, 1)
            nodes.forEach((n, i) => {
                n.color = NODE_COLORS[Math.round((i / last) * (NODE_COLORS.length - 1))]
            })

            setLayout({ w, h, d: buildPath(ys, route), nodes })
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

    // Derive route geometry + scroll keyframes from the rendered path.
    useEffect(() => {
        if (!layout) return
        const pathEl = pathRef.current
        if (!pathEl) return
        const total = pathEl.getTotalLength()
        if (!total) return

        const vh = window.innerHeight
        const nodes = layout.nodes

        /*
         * Length ↔ y lookup for the whole route.
         *
         * The route is far LONGER than the page is tall — every sideways swing
         * buys distance without descending (17.5k of path over 10.7k of page at
         * 1500px wide, so 64% of the stroke goes sideways). Interpolating the
         * car by path length therefore made its vertical speed lurch: it
         * stalled through each crossing and sprinted down each straight,
         * wandering ±290px up and down the viewport over a scroll. Driving it
         * by y instead — and converting y to a length only at the end — keeps
         * it at a steady height beside the reader, which is what makes the
         * dwells legible as deliberate pauses rather than as more lurching.
         *
         * y is monotonic along the path, so one evenly-spaced sample table
         * inverts it; 512 samples is ~21px of path per step here, and the lerp
         * between two samples covers the rest. Sampling once per measure beats
         * a binary search of ~22 getPointAtLength calls on every frame.
         */
        const SAMPLES = 512
        const sampleY = new Float64Array(SAMPLES + 1)
        for (let i = 0; i <= SAMPLES; i++) {
            sampleY[i] = pathEl.getPointAtLength((i / SAMPLES) * total).y
        }
        const fractionAtY = (y) => {
            let lo = 0
            let hi = SAMPLES
            while (lo < hi) {
                const mid = (lo + hi) >> 1
                if (sampleY[mid] < y) lo = mid + 1
                else hi = mid
            }
            if (lo === 0) return 0
            const y0 = sampleY[lo - 1]
            const y1 = sampleY[lo]
            const f = y1 > y0 ? (y - y0) / (y1 - y0) : 0
            return (lo - 1 + f) / SAMPLES
        }

        // Scroll-progress at which each node sits at the viewport centre.
        const denom = Math.max(layout.h - vh, 1)
        const stops = nodes.map((n) => clamp((n.y - vh / 2) / denom, 0, 1))

        // Build the scroll→y keyframes with a flat "dwell" around each stop so
        // the car pauses at every node. The dwell is capped in pixels (see
        // MAX_DWELL_PX) — proportional dwells let the car slide off the top of
        // the screen around a very tall section.
        const maxDwell = MAX_DWELL_PX / denom
        const xs = []
        const ys = []
        for (let i = 0; i < nodes.length; i++) {
            const prev = i > 0 ? stops[i - 1] : 0
            const next = i < nodes.length - 1 ? stops[i + 1] : 1
            const dw = Math.min(
                Math.max(Math.min(stops[i] - prev, next - stops[i]) * 0.28, 0),
                maxDwell
            )
            xs.push(clamp(stops[i] - dw, 0, 1))
            ys.push(nodes[i].y)
            xs.push(clamp(stops[i] + dw, 0, 1))
            ys.push(nodes[i].y)
        }
        if (xs[0] > 0) {
            xs.unshift(0)
            ys.unshift(ys[0])
        }
        if (xs[xs.length - 1] < 1) {
            xs.push(1)
            ys.push(ys[ys.length - 1])
        }
        // keep xs strictly increasing for the interpolation
        for (let i = 1; i < xs.length; i++) if (xs[i] <= xs[i - 1]) xs[i] = xs[i - 1] + 1e-4

        geomRef.current = { total, fractionAtY, nodeYs: nodes.map((n) => n.y), xs, ys }

        const y = prefersReduced ? ys[ys.length - 1] : remap(drawn.get())
        updateCar(y)
    }, [layout, prefersReduced, remap, updateCar, drawn, carProgress])

    // Drive the ribbon draw + car from the (spring-smoothed) scroll value.
    useEffect(() => {
        if (prefersReduced) {
            const g = geomRef.current
            carProgress.set(1)
            if (g) updateCar(g.ys[g.ys.length - 1])
            return
        }
        const apply = (v) => updateCar(remap(v))
        apply(drawn.get())
        return drawn.on('change', apply)
    }, [prefersReduced, drawn, carProgress, remap, updateCar])

    if (!enabled || !layout) return null

    const { w, h, d, nodes } = layout

    return (
        <div
            className="absolute left-0 top-0 pointer-events-none"
            style={{ width: w, height: h, zIndex: 2 }}
            aria-hidden="true"
        >
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ display: 'block' }}>
                <defs>
                    <linearGradient id="section-path-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={h}>
                        {/* One stop per waypoint, evenly spaced, so a node's
                            colour matches the ribbon where it sits. */}
                        {NODE_COLORS.map((c, i) => (
                            <stop
                                key={c}
                                offset={i / (NODE_COLORS.length - 1)}
                                stopColor={c}
                            />
                        ))}
                    </linearGradient>
                </defs>

                {/* Full route, shown faintly in its own colours from the start so the
                    page reads as a colourful route even before the car has drawn over
                    it. Also the geometry source for the car (pathRef). */}
                <path ref={pathRef} d={d} stroke="url(#section-path-grad)" strokeWidth={2} strokeLinecap="round" opacity={0.16} />

                {/* Layered translucent strokes fake a soft bloom without a filter
                    (cheap on a full-page-tall SVG). All draw up to the car. */}
                <motion.path d={d} stroke="url(#section-path-grad)" strokeWidth={10} strokeLinecap="round" opacity={0.1} style={{ pathLength: carProgress }} />
                <motion.path d={d} stroke="url(#section-path-grad)" strokeWidth={5} strokeLinecap="round" opacity={0.28} style={{ pathLength: carProgress }} />
                <motion.path d={d} stroke="url(#section-path-grad)" strokeWidth={2.5} strokeLinecap="round" opacity={0.95} style={{ pathLength: carProgress }} />

                {/* Waypoint nodes */}
                {nodes.map((n, i) => {
                    const lit = i < litCount
                    return (
                        <g key={`${n.x}-${n.y}`}>
                            {/* soft glow blob */}
                            <circle
                                cx={n.x} cy={n.y} r={14} fill={n.color}
                                className={lit ? 'section-path-halo' : undefined}
                                style={{ opacity: lit ? 0.16 : 0.05, transition: 'opacity 0.6s ease' }}
                            />
                            {/* ring */}
                            <circle
                                cx={n.x} cy={n.y} r={6} fill="none" stroke={n.color} strokeWidth={1.5}
                                style={{ opacity: lit ? 0.9 : 0.5, transition: 'opacity 0.5s ease' }}
                            />
                            {/* core */}
                            <circle
                                cx={n.x} cy={n.y} r={3} fill={n.color}
                                style={{ opacity: lit ? 1 : 0.7, transition: 'opacity 0.5s ease' }}
                            />
                        </g>
                    )
                })}

                {/* Arrival burst — expands + fades when the car reaches a node */}
                {burst && nodes[burst.i] && (
                    <circle
                        key={burst.key}
                        cx={nodes[burst.i].x} cy={nodes[burst.i].y} r={9}
                        fill="none" stroke={nodes[burst.i].color} strokeWidth={2}
                        className="path-car-burst"
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                    />
                )}
            </svg>

            {/* The car — imperatively transformed; see the ref layers above */}
            <div ref={carPosRef} className="path-car">
                <div ref={carHopRef} className="path-car__hop">
                    <div ref={carSpinRef} className="path-car__spin">
                        <div ref={carFlipRef} className="path-car__flip">
                            <CarBoundary fallback={<CarGraphic />}>
                                <Suspense fallback={<CarGraphic />}>
                                    <PathCarModel drive={carDriveRef} />
                                </Suspense>
                            </CarBoundary>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
