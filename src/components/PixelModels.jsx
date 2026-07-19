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

const CAM_Z = 6

function Scene({ scrollRef }) {
    const { viewport } = useThree()
    const halfW = viewport.width / 2

    // Anchor objects to the screen edges. viewport.width is measured at z=0,
    // but the frustum widens behind it — scale x by (CAM_Z - z) / CAM_Z so
    // objects hug the edge at their own depth instead of crowding the content.
    // Sit slightly past the frame edge — the dock nav and its tooltips live at
    // the right margin, so floaters peek in rather than sit on top of them.
    const edgeAt = (z, frac = 0.98) => Math.max(halfW * frac, 3.4) * ((CAM_Z - z) / CAM_Z)

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[4, 6, 5]} intensity={1.1} color="#bfefff" />

            {/* Right edge shares space with the fixed dock nav (right: 24px, top: 50%),
               so the two right-side floaters keep to the upper/lower thirds and use a
               gentle drift that never sweeps them through the dock's vertical centre. */}
            <Floater basePos={[edgeAt(-1, 1.04), 2.5, -1]} scrollRef={scrollRef} spin={0.2} drift={-0.6} phase={0}>
                <VoxelInvader />
            </Floater>

            <Floater basePos={[-edgeAt(-1.5), -0.4, -1.5]} scrollRef={scrollRef} spin={0.3} drift={3.5} phase={2}>
                <WireShape geometry={<icosahedronGeometry args={[0.75, 0]} />} />
            </Floater>

            <Floater basePos={[edgeAt(-2, 1.05), -2.8, -2]} scrollRef={scrollRef} spin={0.18} drift={0.7} phase={4}>
                <WireShape geometry={<torusGeometry args={[0.55, 0.22, 6, 10]} />} />
            </Floater>

            <Floater basePos={[-edgeAt(-2.5, 0.94), 2.4, -2.5]} scrollRef={scrollRef} spin={0.4} drift={-3.5} phase={1}>
                <WireShape geometry={<octahedronGeometry args={[0.6, 0]} />} />
            </Floater>
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
            style={{ opacity: 0.55 }}
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
