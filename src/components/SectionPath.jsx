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
const MAX_NODE_GAP = 1150

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
const MAX_DWELL_PX = 64

/*
 * How fast the car still moves through a dwell, as a fraction of its normal
 * speed down the page.
 *
 * A dwell used to be a genuinely FLAT segment in the scroll→y map: two
 * identical y values, so the car stopped dead. Because MAX_DWELL_PX caps the
 * HALF-width, that flat was 220px of scroll wide — a quarter of a screen at
 * every one of the eight waypoints, and a measured 214px sawtooth as the car
 * slid up the viewport and then raced back down. Inside #projects it was worse
 * than a stutter: a waypoint sits mid-way through the pinned card track, where
 * the page behind the car is pinned too, so a car that stops moving is a car
 * on a frozen screen. It read as the animation having broken.
 *
 * Creeping at 35% instead of stopping keeps the beat — the car still visibly
 * slows into a node and pulls away from it — while never producing a frame
 * where nothing at all has changed. It also cuts the drift the catch-up has to
 * undo from 110px per side to ~42px.
 */
const DWELL_SPEED = 0.35

/*
 * The route's sideways wander, as a fraction of the free lane.
 *
 * The rails used to be exactly vertical: one x per section, with every sideways
 * move crammed into the short band spanning a divider. Down the tall sections
 * that produced a literal ruler line — 2,700px of unbroken vertical stroke
 * through #projects — which is what makes the car look motionless there even
 * while it is moving, since a straight line offers no landmark to move against.
 *
 * So each waypoint's x is nudged along a slow sine of its page position. The
 * offset is a fraction of `hi - lo`, the gap between the nearest the ribbon may
 * come to the reading column and the furthest out it may go before it runs
 * under the dock nav, so the wander is bounded by the SAME two constraints the
 * rail position itself is: it can never reach text and never reach the dock. On
 * a viewport too narrow for a clean lane (`hi < lo`) there is nothing to wander
 * inside and the route stays on its rail.
 *
 * WAVE_PX is the wavelength — about one gentle undulation per screen and a
 * half, slow enough to read as a drawn curve rather than as a wobble.
 */
const WANDER = 0.5
const WAVE_PX = 1250

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/*
 * Smooth spline through points using a Catmull-Rom → cubic-bezier conversion.
 * Gives soft, auto-tangented curves as the route weaves side to side.
 *
 * Each control point is CLAMPED to its own segment's bounding box, which a
 * cubic Bézier is guaranteed to stay inside (it lies within the convex hull of
 * its four control points). Two things depend on that:
 *
 *   · No sideways overshoot. Plain Catmull-Rom takes its tangent from the
 *     points either side, so at a waypoint on the right rail the previous
 *     waypoint on the LEFT rail dragged the control point 201px further right
 *     and the curve bulged ~89px past the rail — straight under the dock nav,
 *     which is exactly the clearance the amplitude was calculated to keep.
 *     Clamped, a rail segment (both ends at the same x) is dead vertical and
 *     the entire swing happens in the crossing segment, where it belongs.
 *   · Monotonic y. The route is inverted by y (see the sample table in the
 *     geometry effect) and that inversion assumes y never backtracks. Vertical
 *     overshoot at a waypoint would silently break it.
 */
function buildPath(pts) {
    if (pts.length < 2) return ''
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[i + 2] || pts[i + 1]
        const loX = Math.min(p1.x, p2.x)
        const hiX = Math.max(p1.x, p2.x)
        const loY = Math.min(p1.y, p2.y)
        const hiY = Math.max(p1.y, p2.y)
        const cp1x = clamp(p1.x + (p2.x - p0.x) / 6, loX, hiX)
        const cp1y = clamp(p1.y + (p2.y - p0.y) / 6, loY, hiY)
        const cp2x = clamp(p2.x - (p3.x - p1.x) / 6, loX, hiX)
        const cp2y = clamp(p2.y - (p3.y - p1.y) / 6, loY, hiY)
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
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
    /*
     * Smoothing, not lag. The old 80/30 is heavily overdamped (ζ ≈ 1.7) and
     * took the better part of a second to settle, so on any quick scroll the
     * cards — which read raw scroll — moved at once and the car crawled after
     * them. 190/34 keeps the same no-overshoot character (ζ ≈ 1.3) at roughly
     * twice the natural frequency, which lands the car with the content.
     */
    const drawn = useSpring(scrollYProgress, { stiffness: 190, damping: 34, restDelta: 0.001 })

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
            const amp = hi >= lo ? lo + (hi - lo) * 0.72 : Math.min(lo, w / 2 - 40)

            /*
             * Amplitude at a given page y - the rail's distance from centre,
             * wandering slowly inside the free lane (see WANDER / WAVE_PX).
             *
             * Both bounds are absolute: `lo` is the reading column plus its
             * clearance and `hi` is short of the dock nav, so clamping to them
             * means no phase of the wave can put the ribbon over text or under
             * the icons. Where the lane has no width there is nothing to
             * wander in and every waypoint falls back to the flat rail, which
             * is exactly the old behaviour.
             */
            const lane = hi >= lo ? (hi - lo) * WANDER : 0
            const ampAt = (y) =>
                lane > 0
                    ? clamp(amp + Math.sin(y / WAVE_PX) * (lane / 2), lo, hi)
                    : amp

            // A node on its own gives the spline nothing to hold onto, so between
            // two sections on opposite sides it used to cut one long diagonal
            // straight across the content column — barely visible in a 900px
            // section, a 5,500px gash through the projects copy.
            //
            // Rail points near each section's top and bottom, at the same x as
            // its nodes, pin the curve into the gutter for the whole section and
            // force the left↔right swing into the band spanning the divider.
            // Every section carries ~112–144px of vertical padding, so the swing
            // crosses air instead of paragraphs — which is exactly why the inset
            // has to stay under that 112px.
            const CROSS_HALF = 104

            const fallbackH = h / SECTION_IDS.length
            // `dir` is the side of the page a section's rail runs down; the x
            // of any point ON that rail is now a function of its own y, so the
            // rail curves instead of ruling straight.
            const railX = (dir, y) => cx + dir * ampAt(y)
            const measured = SECTION_IDS.map((id, i) => {
                const el = document.getElementById(id)
                const rect = el?.getBoundingClientRect()
                const top = rect ? rect.top + window.scrollY : fallbackH * i
                const height = rect ? rect.height : fallbackH
                const dir = i % 2 === 0 ? -1 : 1
                const inset = Math.min(CROSS_HALF, height / 2 - 1)
                return { dir, top, height, inset }
            })

            /*
             * Visible waypoints: one per section for a normal section, several
             * spaced down the rail for a tall one (see MAX_NODE_GAP). They all
             * share their section's x, so subdividing never adds a crossing —
             * a tall section just gets more beats on the same straight.
             */
            const nodes = []
            measured.forEach((sec, si) => {
                const from = sec.top + sec.inset
                const span = Math.max(sec.height - sec.inset * 2, 0)
                const count = Math.max(1, Math.round(span / MAX_NODE_GAP))
                for (let k = 0; k < count; k++) {
                    const y =
                        count === 1
                            ? sec.top + sec.height / 2
                            : from + (span * (k + 0.5)) / count
                    nodes.push({ x: railX(sec.dir, y), y, section: si })
                }
            })
            // Colour by position down the page so the ramp still lines up with
            // the ribbon's gradient now that nodes outnumber sections.
            const last = Math.max(nodes.length - 1, 1)
            nodes.forEach((n, i) => {
                n.color = NODE_COLORS[Math.round((i / last) * (NODE_COLORS.length - 1))]
            })

            /*
             * The stroke now runs THROUGH every waypoint rather than past it.
             *
             * It used to be built from three points per section — enter, mid,
             * exit — so a tall section contributed one dead-straight run and
             * the extra waypoints subdividing it were dots sitting ON that
             * line rather than bends in it. Threading the same nodes the car
             * stops at means each one is a place the route actually turns, and
             * a subdivided section reads as a curve with beats on it.
             *
             * Every point here still belongs to its own section's rail, so the
             * left/right crossing is still confined to the band spanning a
             * divider, where the sections' vertical padding gives it air.
             */
            const pathPts = [{ x: railX(measured[0].dir, 0), y: 0 }]
            measured.forEach((sec, i) => {
                const mid = sec.top + sec.height / 2
                const enter = sec.top + sec.inset
                if (enter < mid) pathPts.push({ x: railX(sec.dir, enter), y: enter })
                const own = nodes.filter((n) => n.section === i)
                if (own.length === 1) {
                    pathPts.push({ x: railX(sec.dir, mid), y: mid })
                } else {
                    own.forEach((n) => pathPts.push({ x: n.x, y: n.y }))
                }
                // The route ENDS at the last section (contact) — the car "arrives"
                // there instead of driving on into the footer and clipping the
                // page bottom — so that one gets no exit rail.
                const exit = sec.top + sec.height - sec.inset
                if (i < measured.length - 1 && exit > mid) {
                    pathPts.push({ x: railX(sec.dir, exit), y: exit })
                }
            })
            // The spline inverts by y, and that inversion assumes y never goes
            // backwards. Rounding, and a section measuring shorter than its own
            // inset, are the two ways a duplicate or out-of-order y can slip in,
            // so drop them here rather than debug a silently wrong car later.
            const ordered = pathPts.filter(
                (pt, i) => i === 0 || pt.y > pathPts[i - 1].y + 0.5
            )

            setLayout({ w, h, d: buildPath(ordered), nodes })
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

        /*
         * Build the scroll→y keyframes with a slow "dwell" around each stop, so
         * the car eases through every node instead of stopping at it.
         *
         * The window is still capped in pixels (see MAX_DWELL_PX) — a
         * proportional dwell lets the car slide off the top of the screen
         * around a very tall section — but the two keyframes bracketing a stop
         * are no longer the SAME y. They sit DWELL_SPEED of a normal advance
         * either side of the node, so across the window the car still covers
         * ground, just slowly. That distinction is the whole fix: a flat
         * segment freezes the car in document space for the width of the
         * window, and 220px of frozen car in the middle of the pinned card
         * track — where the page behind it is not moving either — is a car that
         * looks broken rather than one that looks like it is pausing.
         */
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
            // How far the car creeps across half the window, in page pixels.
            const creep = dw * denom * DWELL_SPEED
            xs.push(clamp(stops[i] - dw, 0, 1))
            ys.push(nodes[i].y - creep)
            xs.push(clamp(stops[i] + dw, 0, 1))
            ys.push(nodes[i].y + creep)
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
        // ...and ys non-decreasing. The creep either side of a stop can only
        // reorder these where two nodes sit closer together than their own
        // dwell windows, which subdividing a tall section can produce; the car
        // is driven by this table, so a backwards step here would show up as it
        // twitching upward mid-route.
        for (let i = 1; i < ys.length; i++) if (ys[i] < ys[i - 1]) ys[i] = ys[i - 1]

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
