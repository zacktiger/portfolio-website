import { useState, useEffect, useRef, useCallback } from 'react'

const isTouchDevice = () => 'ontouchstart' in window && navigator.maxTouchPoints > 0

const RING_SIZE = 32
const DOT_SIZE = 8
// Fraction of the remaining gap the ring closes per frame — lower reads as more lag.
const RING_EASE = 0.2
const HOVER_SCALE = 1.9
const INTERACTIVE_SELECTOR =
    'a, button, [role="button"], input, textarea, select, label, [data-project-id]'

function createParticles(x, y) {
    const count = 6 + Math.floor(Math.random() * 4)
    const particles = []
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8
        const speed = 35 + Math.random() * 50
        const size = 1.5 + Math.random() * 2
        particles.push({ id: Date.now() + i, x, y, angle, speed, size, life: 1 })
    }
    return particles
}

export default function CustomCursor() {
    const [isTouch, setIsTouch] = useState(false)
    const canvasRef = useRef(null)
    const dotRef = useRef(null)
    const ringRef = useRef(null)

    const pointerRef = useRef({ x: 0, y: 0 })
    const ringPosRef = useRef({ x: 0, y: 0 })
    const scaleRef = useRef(1)
    const targetScaleRef = useRef(1)
    const hasMovedRef = useRef(false)

    const particlesRef = useRef([])
    const particleLoopRef = useRef(null)
    const ringLoopRef = useRef(null)

    useEffect(() => { setIsTouch(isTouchDevice()) }, [])

    /* ── Ring easing ──────────────────────────────────────────────
       The ring chases the pointer instead of being pinned to it. The loop
       parks itself once the ring has caught up, so an idle cursor costs
       zero frames. */
    const runRingLoop = useCallback(() => {
        if (ringLoopRef.current) return
        const step = () => {
            const ring = ringRef.current
            if (!ring) { ringLoopRef.current = null; return }

            const p = pointerRef.current
            const r = ringPosRef.current
            r.x += (p.x - r.x) * RING_EASE
            r.y += (p.y - r.y) * RING_EASE
            scaleRef.current += (targetScaleRef.current - scaleRef.current) * RING_EASE

            const settled =
                Math.abs(p.x - r.x) < 0.1 &&
                Math.abs(p.y - r.y) < 0.1 &&
                Math.abs(targetScaleRef.current - scaleRef.current) < 0.005

            if (settled) {
                // Snap to the target so repeated near-misses can't accumulate drift
                r.x = p.x
                r.y = p.y
                scaleRef.current = targetScaleRef.current
                ringLoopRef.current = null
            }

            ring.style.transform =
                `translate3d(${r.x - RING_SIZE / 2}px, ${r.y - RING_SIZE / 2}px, 0) scale(${scaleRef.current})`

            if (!settled) ringLoopRef.current = requestAnimationFrame(step)
        }
        ringLoopRef.current = requestAnimationFrame(step)
    }, [])

    useEffect(() => {
        if (isTouch) return

        const handleMove = (e) => {
            const nx = e.clientX
            const ny = e.clientY
            pointerRef.current = { x: nx, y: ny }

            if (!hasMovedRef.current) {
                // Drop the ring straight onto the pointer so it doesn't fly in from 0,0
                hasMovedRef.current = true
                ringPosRef.current = { x: nx, y: ny }
            }

            if (dotRef.current) {
                dotRef.current.style.transform =
                    `translate3d(${nx - DOT_SIZE / 2}px, ${ny - DOT_SIZE / 2}px, 0)`
                dotRef.current.style.opacity = '1'
            }
            if (ringRef.current) ringRef.current.style.opacity = '1'

            targetScaleRef.current = e.target?.closest?.(INTERACTIVE_SELECTOR)
                ? HOVER_SCALE
                : 1

            runRingLoop()
        }

        const setVisible = (visible) => {
            const v = visible ? '1' : '0'
            if (dotRef.current) dotRef.current.style.opacity = v
            if (ringRef.current) ringRef.current.style.opacity = v
        }
        const handleLeave = () => setVisible(false)
        const handleEnter = () => setVisible(true)

        window.addEventListener('mousemove', handleMove)
        document.addEventListener('mouseleave', handleLeave)
        document.addEventListener('mouseenter', handleEnter)
        return () => {
            window.removeEventListener('mousemove', handleMove)
            document.removeEventListener('mouseleave', handleLeave)
            document.removeEventListener('mouseenter', handleEnter)
            if (ringLoopRef.current) cancelAnimationFrame(ringLoopRef.current)
            ringLoopRef.current = null
        }
    }, [isTouch, runRingLoop])

    /* ── Laser-hit particles ──────────────────────────────────────
       Only spins up while there are particles alive, then stops. */
    const runParticleLoop = useCallback(() => {
        if (particleLoopRef.current) return
        let last = performance.now()
        const loop = (now) => {
            const canvas = canvasRef.current
            const ctx = canvas?.getContext('2d')
            if (!ctx) { particleLoopRef.current = null; return }

            const dt = Math.min((now - last) / 1000, 0.05)
            last = now
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            particlesRef.current = particlesRef.current.filter(p => p.life > 0)
            particlesRef.current.forEach(p => {
                p.x += Math.cos(p.angle) * p.speed * dt
                p.y += Math.sin(p.angle) * p.speed * dt
                p.life -= dt * 3.5
                p.speed *= 0.96
                const alpha = Math.max(0, p.life)
                ctx.save()
                ctx.globalAlpha = alpha
                ctx.shadowColor = `rgba(0, 212, 255, ${alpha})`
                ctx.shadowBlur = 6
                const len = p.size * 2.5
                ctx.lineWidth = p.size * 0.7
                ctx.lineCap = 'round'
                ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`
                ctx.beginPath()
                ctx.moveTo(p.x, p.y)
                ctx.lineTo(p.x - Math.cos(p.angle) * len, p.y - Math.sin(p.angle) * len)
                ctx.stroke()
                ctx.restore()
            })

            if (particlesRef.current.length === 0) {
                particleLoopRef.current = null
                return
            }
            particleLoopRef.current = requestAnimationFrame(loop)
        }
        particleLoopRef.current = requestAnimationFrame(loop)
    }, [])

    useEffect(() => {
        if (isTouch) return
        const canvas = canvasRef.current
        if (!canvas) return
        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)
        return () => {
            window.removeEventListener('resize', resize)
            if (particleLoopRef.current) cancelAnimationFrame(particleLoopRef.current)
            particleLoopRef.current = null
        }
    }, [isTouch])

    const shoot = useCallback((e) => {
        const x = e.clientX ?? e.touches?.[0]?.clientX
        const y = e.clientY ?? e.touches?.[0]?.clientY
        if (x == null) return

        const hitEl = document.elementFromPoint(x, y)
        const projectBtn = hitEl?.closest('[data-project-id]')

        if (projectBtn) {
            document.body.classList.add('screen-shake')
            setTimeout(() => document.body.classList.remove('screen-shake'), 100)
            particlesRef.current.push(...createParticles(x, y))
            runParticleLoop()
            projectBtn.dispatchEvent(new CustomEvent('laser-hit', {
                detail: { projectId: projectBtn.dataset.projectId },
                bubbles: true,
            }))
        }
    }, [runParticleLoop])

    useEffect(() => {
        window.addEventListener('click', shoot)
        return () => window.removeEventListener('click', shoot)
    }, [shoot])

    if (isTouch) return null

    return (
        <>
            <canvas
                ref={canvasRef}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99998,
                    pointerEvents: 'none',
                }}
            />
            {/* Lagging ring — the locator. `difference` keeps it readable on the
                dark bg, over the white headings, and over the cyan display type. */}
            <div
                ref={ringRef}
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    pointerEvents: 'none',
                    zIndex: 99999,
                    opacity: 0,
                    willChange: 'transform',
                    width: RING_SIZE,
                    height: RING_SIZE,
                    borderRadius: '50%',
                    border: '1.5px solid #ffffff',
                    mixBlendMode: 'difference',
                }}
            />
            {/* Dot — pinned to the pointer, no lag */}
            <div
                ref={dotRef}
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    pointerEvents: 'none',
                    zIndex: 99999,
                    opacity: 0,
                    willChange: 'transform',
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    borderRadius: '50%',
                    background: '#ffffff',
                    mixBlendMode: 'difference',
                }}
            />
        </>
    )
}
