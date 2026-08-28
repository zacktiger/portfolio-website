import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

/*
 * Pixelated 3D floaters — retro PS1/voxel aesthetic.
 * The whole canvas renders at very low resolution (dpr 0.35) with
 * image-rendering: pixelated, so every model gets chunky pixels for free.
 * Objects drift, spin, and parallax with page scroll.
 */

const ACCENT = '#00d4ff'
const DARK = '#0d2b33'

/* Space-invader voxel pattern (1 = box) — nod to the retro game easter egg */
const INVADER = [
    [0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 0, 1, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 1],
    [0, 0, 0, 1, 1, 1, 0, 0, 0],
]

function useScrollRef() {
    const scrollRef = useRef(0)
    useEffect(() => {
        const onScroll = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight
            scrollRef.current = max > 0 ? window.scrollY / max : 0
        }
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])
    return scrollRef
}

/* Shared drift/spin behaviour */
function Floater({ children, basePos, scrollRef, spin = 0.25, drift = 3, phase = 0 }) {
    const group = useRef()

    useFrame(({ clock }) => {
        const g = group.current
        if (!g) return
        const t = clock.elapsedTime
        const s = scrollRef.current

        g.rotation.y = t * spin + s * Math.PI * 2
        g.rotation.x = Math.sin(t * 0.35 + phase) * 0.25 + s * 1.5
        g.position.x = basePos[0] + Math.sin(t * 0.25 + phase) * 0.18
        // idle bob + scroll parallax drift upward
        g.position.y = basePos[1] + Math.sin(t * 0.5 + phase) * 0.22 + s * drift
        g.position.z = basePos[2]
    })

    return <group ref={group} position={basePos}>{children}</group>
}

function VoxelInvader({ size = 0.16 }) {
    const boxes = useMemo(() => {
        const out = []
        const rows = INVADER.length
        const cols = INVADER[0].length
        INVADER.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell) {
                    out.push([
                        (c - (cols - 1) / 2) * size,
                        ((rows - 1) / 2 - r) * size,
                        0,
                    ])
                }
            })
        })
        return out
    }, [size])

    return (
        <group>
            {boxes.map((pos, i) => (
                <mesh key={i} position={pos}>
                    <boxGeometry args={[size * 0.92, size * 0.92, size * 0.92]} />
                    <meshStandardMaterial
                        color={DARK}
                        emissive={ACCENT}
                        emissiveIntensity={0.55}
                        flatShading
                    />
                </mesh>
            ))}
        </group>
    )
}

function WireShape({ geometry }) {
    return (
        <group>
            {/* Faint glassy core so the shape has volume without reading as a muddy blob */}
            <mesh>
                {geometry}
                <meshStandardMaterial
                    color={DARK}
                    emissive={ACCENT}
                    emissiveIntensity={0.1}
                    flatShading
                    transparent
                    opacity={0.22}
                />
            </mesh>
            {/* Bright edges carry the form — glowing wireframe, like the hero constellation */}
            <mesh scale={1.003}>
                {geometry}
                <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0.6} />
            </mesh>
        </group>
    )
}

/**
 * A Floater that only exists if `edgeFor` found room for it in the gutter.
 * `x` is null when the window is too narrow for the shape to clear the text,
 * and a shape with nowhere to go is better dropped than drawn over a sentence.
 */
function GutterFloater({ x, flip = false, y, z, children, ...rest }) {
    if (x === null) return null
    return (
        <Floater basePos={[flip ? -x : x, y, z]} {...rest}>
            {children}
        </Floater>
    )
}

const CAM_Z = 6

// Mirrors `.content-container`'s max-width in index.css.
const CONTENT_MAX_PX = 1100

function Scene({ scrollRef }) {
    const { viewport, size } = useThree()
    const halfW = viewport.width / 2
    const worldPerPx = viewport.width / size.width

    // Where the reading column actually ends, in world units. `.content-container`
    // is capped at 1100px and carries clamp(24px, 5vw, 80px) of inner padding —
    // mirrored here so the floaters know what they have to clear.
    const padPx = Math.min(80, Math.max(24, size.width * 0.05))
    const contentHalfWorld =
        ((Math.min(CONTENT_MAX_PX, size.width) - padPx * 2) / 2) * worldPerPx

    // Anchor an object of the given bounding radius so its WHOLE shape sits just
    // inside the visible frame at its own depth. viewport.width is measured at
    // z=0, but the frustum widens behind it, so scale the visible half-width by
    // (CAM_Z - z) / CAM_Z. Then subtract the object's radius (+ a little for its
    // horizontal drift) so the edge tucks against the frame instead of the centre
    // sitting on the frame and the outer half getting sliced off.
    //
    // Returns null when that position would still overlap the text column. The
    // old floor clamped to `radius + 1` instead, which is what parked an invader
    // on top of the copy on any window narrower than ~1400px: the shapes hug the
    // VIEWPORT edge, but the content only stops 478px from the centre, so on a
    // 1280px window "just inside the frame" and "on the third bullet" are the
    // same place. A shape with no room in the gutter is dropped, not squeezed.
    const edgeFor = (z, radius, margin = 0.5) => {
        // Both the frame and the text column widen with depth, so the content
        // edge has to be scaled into the same plane as `outer` before they can
        // be compared — a world x at z=-2.5 is not the same distance as the
        // identical world x at z=0.
        const depthScale = (CAM_Z - z) / CAM_Z
        const outer = halfW * depthScale - radius - margin
        const clearsText = outer >= contentHalfWorld * depthScale + radius + margin
        return clearsText ? outer : null
    }

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[4, 6, 5]} intensity={1.1} color="#bfefff" />

            {/* Right edge shares space with the fixed dock nav (right: 24px, top: 50%),
               so the two right-side floaters keep to the upper/lower thirds and use a
               gentle drift that never sweeps them through the dock's vertical centre.
               Radii are bounding-sphere estimates — objects spin freely, so any vertex
               can swing outward and must clear the edge. */}
            {/* Invader is a 9×8 plate spinning on two axes, so its bounding sphere
               (~1.0) is wider than the flat shape looks. */}
            <GutterFloater x={edgeFor(-1, 1.0)} y={2.5} z={-1} scrollRef={scrollRef} spin={0.2} drift={-0.6} phase={0}>
                <VoxelInvader />
            </GutterFloater>

            <GutterFloater x={edgeFor(-1.5, 0.8)} flip y={-0.4} z={-1.5} scrollRef={scrollRef} spin={0.3} drift={3.5} phase={2}>
                <WireShape geometry={<icosahedronGeometry args={[0.75, 0]} />} />
            </GutterFloater>

            <GutterFloater x={edgeFor(-2, 0.82)} y={-2.8} z={-2} scrollRef={scrollRef} spin={0.18} drift={0.7} phase={4}>
                <WireShape geometry={<torusGeometry args={[0.55, 0.22, 6, 10]} />} />
            </GutterFloater>

            <GutterFloater x={edgeFor(-2.5, 0.65)} flip y={2.4} z={-2.5} scrollRef={scrollRef} spin={0.4} drift={-3.5} phase={1}>
                <WireShape geometry={<octahedronGeometry args={[0.6, 0]} />} />
            </GutterFloater>
        </>
    )
}

export default function PixelModels() {
    const [enabled, setEnabled] = useState(false)
    const scrollRef = useScrollRef()

    // Skip on mobile and for users who prefer reduced motion
    useEffect(() => {
        const wide = window.matchMedia('(min-width: 768px)')
        const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)')
        const update = () => setEnabled(wide.matches && motionOk.matches)
        update()
        wide.addEventListener('change', update)
        motionOk.addEventListener('change', update)
        return () => {
            wide.removeEventListener('change', update)
            motionOk.removeEventListener('change', update)
        }
    }, [])

    if (!enabled) return null

    return (
        <div
            className="fixed inset-0 z-0 pointer-events-none"
            style={{ opacity: 0.7 }}
            aria-hidden="true"
        >
            <Canvas
                dpr={0.35}
                gl={{ antialias: false, alpha: true }}
                camera={{ position: [0, 0, 6], fov: 60 }}
                style={{ imageRendering: 'pixelated' }}
            >
                <Scene scrollRef={scrollRef} />
            </Canvas>
        </div>
    )
}
