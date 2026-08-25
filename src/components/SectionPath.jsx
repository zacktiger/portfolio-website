import { useRef, useState, useEffect, useLayoutEffect, useCallback, lazy, Suspense, Component } from 'react'
import { motion, useScroll, useMotionValue, useReducedMotion } from 'framer-motion'

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
 * The car keeps ONE seat on screen (see CAR_SEAT) and the route flows past it:
 * its document position is `scrollY + seat`, so it never travels up or down the
 * viewport. What reads as motion is the route sliding by and the car steering
 * into the bends, plus an arrival burst as each waypoint passes it. Reversing
 * the scroll makes it hop and flip 180° to face the new direction.
 *
 * That replaced a scroll→y map with a "dwell" at every waypoint. A dwell holds
 * the car still in DOCUMENT space, so it slid the car up the screen and then
 * raced it back down — a measured 557px sawtooth. It could not be tuned out,
 * because any mapping whose y advances at a rate other than the scroll rate
 * moves the car on screen; the identity map is the only one that does not.
 *
 * One rule still ties the route's rhythm to the page's rhythm rather than to
 * its pixel height, and it exists because breaking it looked broken: waypoints
 * are spaced by DISTANCE, not one per section (see MAX_NODE_GAP).
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
 * Where the car sits on screen, as a fraction of the viewport height.
 *
 * The car does not travel down the viewport at all: it holds this one seat and
 * the route flows past it, the way a car's own view of the road works. Its
 * document position is therefore just `scrollY + CAR_SEAT * vh`, which makes
 * its screen position exact by construction rather than something the scroll
 * mapping has to be tuned to preserve.
 *
 * That replaces a scroll->y keyframe table with a "dwell" window at every
 * waypoint. The intent there was a beat at each node, but a dwell holds the car
 * still in DOCUMENT space, so every pixel of it slid the car up the viewport
 * and the catch-up afterwards slid it back down — a 557px vertical sawtooth
 * over a scroll, measured. Softening the dwell into a slow creep only halved
 * it. The reason it could not be tuned away is structural: any mapping where
 * the car's y advances at a rate other than the scroll rate moves the car on
 * screen, so the only mapping that holds it still is the identity one.
 *
 * With the car fixed, motion is read from the route sliding past it and from
 * the car steering into the bends — both of which survive the pinned card
 * track, where the page behind the car is not scrolling and a car that also
 * held its document position had nothing at all to move against.
 */
const CAR_SEAT = 0.5

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

    /*
     * Raw page scroll, deliberately unsmoothed.
     *
     * This used to be a spring on scroll PROGRESS, and the spring is exactly
     * what a fixed car seat cannot tolerate: a spring is a lag, and a lag is
     * movement. It let the car sag down the screen during a fast scroll and
     * float back up once the scroll stopped. The ribbon's draw comes off the
     * car's own position (`carProgress`, set in updateCar), so dropping the
     * spring keeps the trail ending exactly at the car rather than somewhere
     * behind it.
     */
    const { scrollY } = useScroll()

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

    // Page scroll → the document y the car sits at. This is the identity map
    // plus the car's seat, clamped to the span of the route, which is what
    // keeps the car's SCREEN position constant no matter how the route bends.
    const yForScroll = useCallback((sy) => {
        const g = geomRef.current
        const seat = window.innerHeight * CAR_SEAT
        if (!g) return sy + seat
        return clamp(sy + seat, g.minY, g.maxY)
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

        /*
         * The car goes EXACTLY on the point for y, and the TRAIL is what gets
         * held back — the reverse of the obvious arrangement, and the reason the
         * seat is exact rather than approximate.
         *
         * Offsetting the car forward by LEAD along the path is the natural way
         * to make it look like it is pulling the trail rather than sitting on
         * top of it, but on any diagonal stretch that offset has a vertical
         * component, so the car rose and fell by up to ±LEAD as the route
         * changed angle — 40px of bob left over on a 768px window once the seat
         * itself was fixed. Ending the trail LEAD short of the car instead
         * leaves the same gap between its tail and the trail tip while leaving
         * the car's own y untouched.
         */
        const LEAD = 20
        const L = clamp(t * g.total, 0, g.total)
        const p = pathEl.getPointAtLength(L)
        carProgress.set(clamp((L - LEAD * headingRef.current) / g.total, 0, 1))
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
                const exit = sec.top + sec.height - sec.inset
                if (i < measured.length - 1 && exit > mid) {
                    pathPts.push({ x: railX(sec.dir, exit), y: exit })
                }
            })
            /*
             * Run the last rail all the way to the foot of the page.
             *
             * The route used to stop at the middle of #contact so the car
             * "arrived" there rather than driving on into the footer. With the
             * car seated at a fixed height that ending becomes visible as the
             * thing it was avoiding: the car's document y is scrollY + seat, so
             * at the bottom of the page it needs the route to exist down to
             * `h - vh/2`. Ending short of that clamps it, and a clamped car
             * slides up the screen for the last few hundred pixels of scroll —
             * the one bit of drift left, right where it is most noticeable.
             *
             * The extension is on the final section's own rail, so it adds no
             * crossing, and it stays in the gutter clear of the footer's text.
             */
            const lastDir = measured[measured.length - 1].dir
            pathPts.push({ x: railX(lastDir, h), y: h })
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

        // The route's y span. `fractionAtY` inverts by y and its sample table
        // covers exactly this range, so clamping the car into it is what stops
        // a scroll position past the end of the route from being read as a
        // fraction off the end of the path.
        const minY = sampleY[0]
        const maxY = sampleY[SAMPLES]

        geomRef.current = {
            total,
            fractionAtY,
            nodeYs: nodes.map((n) => n.y),
            minY,
            maxY,
        }

        updateCar(prefersReduced ? maxY : yForScroll(window.scrollY))
    }, [layout, prefersReduced, yForScroll, updateCar])

    // Drive the car straight off page scroll — see CAR_SEAT for why this is
    // deliberately unsmoothed.
    useEffect(() => {
        if (prefersReduced) {
            const g = geomRef.current
            carProgress.set(1)
            if (g) updateCar(g.maxY)
            return
        }
        const apply = (sy) => updateCar(yForScroll(sy))
        apply(window.scrollY)
        return scrollY.on('change', apply)
    }, [prefersReduced, scrollY, carProgress, yForScroll, updateCar])

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
