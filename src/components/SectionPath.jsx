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
 * so it curves left and right to pass through the vertical centre of each one,
 * dropping a glowing waypoint node on the way. The coloured stroke draws itself
 * up to the car (Framer Motion `useScroll`), so the car looks like it's laying
 * the trail behind it.
 *
 * The car's progress along the path is keyed to the section nodes: scrolling
 * drives it from one node to the next, and it *dwells* at each node (a flat
 * spot in the scroll→progress map) with an arrival burst. Reversing the scroll
 * makes it hop and flip 180° to face the new direction.
 *
 * It sits at z-2: above the ambient PixelModels floaters, behind the content.
 * Everything is pointer-events:none and aria-hidden — purely decorative.
 */

// Anchors to route through (kept in sync with Navbar's navItems / section ids)
const SECTION_IDS = ['home', 'about', 'skills', 'projects', 'github', 'writing', 'contact']

// One hue per node, sampled down the same ramp as the gradient below so a
// node's colour matches the ribbon where it sits.
const NODE_COLORS = ['#00d4ff', '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fbbf24', '#34d399']

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

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
    const lastTRef = useRef(null) // last route fraction, for deadzoned heading changes
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

    // scroll-progress value → route fraction, via the node keyframes (flat spots
    // make the car dwell at each node).
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

    // Position + orient the car at route fraction t. This is the single source of
    // truth for everything keyed to the car: it also lights the nodes the car has
    // reached, flips the car to face its travel direction, and fires an arrival
    // burst — all from the same t, so nothing drifts out of sync with the car.
    // (Lighting and the flip used to be driven off raw scrollY, which ran ahead
    // of the spring-smoothed car.)
    const updateCar = useCallback((t) => {
        const g = geomRef.current
        const pathEl = pathRef.current
        const pos = carPosRef.current
        const spin = carSpinRef.current
        if (!g || !pathEl || !pos || !spin) return

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
            const prevT = lastTRef.current
            if (prevT === null) {
                lastTRef.current = t
            } else if (Math.abs(t - prevT) > 0.0015) {
                const dir = t > prevT ? 1 : -1
                if (dir !== headingRef.current) {
                    headingRef.current = dir
                    triggerHop()
                }
                lastTRef.current = t
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

        // Light every node the car has reached (keyed to the same t that positions
        // it), so a waypoint lights exactly as the car arrives.
        let count = 0
        for (let i = 0; i < g.fracs.length; i++) if (t >= g.fracs[i]) count++
        if (count !== litCountRef.current) {
            litCountRef.current = count
            setLitCount(count)
        }

        // arrival: nearest node within a small fraction window
        let nearest = -1
        let best = 0.025
        for (let i = 0; i < g.fracs.length; i++) {
            const dd = Math.abs(g.fracs[i] - t)
            if (dd < best) {
                best = dd
                nearest = i
            }
        }
        if (nearest !== arrivedRef.current) {
            arrivedRef.current = nearest
            if (nearest !== -1) setBurst({ i: nearest, key: performance.now() })
        }
    }, [prefersReduced, triggerHop])

    // Measure the page and build the route through each section's centre.
    useLayoutEffect(() => {
        const measure = () => {
            const w = document.documentElement.clientWidth
            const h = document.documentElement.scrollHeight
            if (!w || !h) return

            const cx = w / 2
            // Swing the route out toward the gutters so waypoints sit beside the
            // content, not on it. Cap the swing at (half-width − 130px) so a node
            // (plus the car's ~32px half-width) stays clear of the right-edge dock
            // nav even on narrow desktops (~768–900px), where it used to overlap.
            const amp = Math.min(w * 0.4, w / 2 - 130)

            const nodes = SECTION_IDS.map((id, i) => {
                const el = document.getElementById(id)
                const rect = el?.getBoundingClientRect()
                const y = rect
                    ? rect.top + window.scrollY + rect.height / 2
                    : (h / SECTION_IDS.length) * (i + 0.5)
                const dir = i % 2 === 0 ? -1 : 1
                return { x: cx + dir * amp, y, color: NODE_COLORS[i % NODE_COLORS.length] }
            })

            // Thread in from the top edge for a clean lead-in, then END at the last
            // section node (contact) — the car "arrives" there instead of driving
            // on into the empty footer and clipping the page bottom.
            const pathPts = [{ x: nodes[0].x, y: 0 }, ...nodes]

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

    // Derive route geometry + scroll keyframes from the rendered path.
    useEffect(() => {
        if (!layout) return
        const pathEl = pathRef.current
        if (!pathEl) return
        const total = pathEl.getTotalLength()
        if (!total) return

        const vh = window.innerHeight
        const nodes = layout.nodes

        // Each node's length fraction along the path (y is monotonic, so a
        // binary search on the sampled point's y finds it).
        const fracs = nodes.map((n) => {
            let lo = 0
            let hi = total
            for (let k = 0; k < 22; k++) {
                const mid = (lo + hi) / 2
                if (pathEl.getPointAtLength(mid).y < n.y) lo = mid
                else hi = mid
            }
            return lo / total
        })

        // Scroll-progress at which each node sits at the viewport centre.
        const denom = Math.max(layout.h - vh, 1)
        const stops = nodes.map((n) => clamp((n.y - vh / 2) / denom, 0, 1))

        // Build the scroll→fraction keyframes with a flat "dwell" around each
        // stop so the car pauses at every node.
        const xs = []
        const ys = []
        for (let i = 0; i < nodes.length; i++) {
            const prev = i > 0 ? stops[i - 1] : 0
            const next = i < nodes.length - 1 ? stops[i + 1] : 1
            const dw = Math.max(Math.min(stops[i] - prev, next - stops[i]) * 0.28, 0)
            xs.push(clamp(stops[i] - dw, 0, 1))
            ys.push(fracs[i])
            xs.push(clamp(stops[i] + dw, 0, 1))
            ys.push(fracs[i])
        }
        if (xs[0] > 0) {
            xs.unshift(0)
            ys.unshift(ys[0])
        }
        if (xs[xs.length - 1] < 1) {
            xs.push(1)
            ys.push(1)
        }
        // keep xs strictly increasing for the interpolation
        for (let i = 1; i < xs.length; i++) if (xs[i] <= xs[i - 1]) xs[i] = xs[i - 1] + 1e-4

        geomRef.current = { total, fracs, xs, ys }

        const t = prefersReduced ? 1 : remap(drawn.get())
        carProgress.set(t)
        updateCar(t)
    }, [layout, prefersReduced, remap, updateCar, drawn, carProgress])

    // Drive the ribbon draw + car from the (spring-smoothed) scroll value.
    useEffect(() => {
        if (prefersReduced) {
            carProgress.set(1)
            return
        }
        const apply = (v) => {
            const t = remap(v)
            carProgress.set(t)
            updateCar(t)
        }
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
                        <stop offset="0" stopColor="#00d4ff" />
                        <stop offset="0.16" stopColor="#38bdf8" />
                        <stop offset="0.33" stopColor="#818cf8" />
                        <stop offset="0.5" stopColor="#c084fc" />
                        <stop offset="0.66" stopColor="#f472b6" />
                        <stop offset="0.83" stopColor="#fbbf24" />
                        <stop offset="1" stopColor="#34d399" />
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
                        <g key={SECTION_IDS[i]}>
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
