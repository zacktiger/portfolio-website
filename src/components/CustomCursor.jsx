import { useState, useEffect, useRef, useCallback } from 'react'

const isTouchDevice = () => 'ontouchstart' in window && navigator.maxTouchPoints > 0

const MAX_TRAIL = 28
const TRAIL_MAX_LEN = 55
const TRAIL_DECAY = 6

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

function interpolate(a, b, spacing) {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < spacing) return []
    const steps = Math.floor(dist / spacing)
    const pts = []
    for (let i = 1; i <= steps; i++) {
        const t = i / (steps + 1)
        pts.push({ x: a.x + dx * t, y: a.y + dy * t, life: 1 })
    }
    return pts
}

export default function CustomCursor() {
    const [isTouch, setIsTouch] = useState(false)
    const canvasRef = useRef(null)
    const cursorRef = useRef(null)
    const trailRef = useRef([])
    const particlesRef = useRef([])
    const animRef = useRef(null)
    const lastPosRef = useRef(null)

    useEffect(() => { setIsTouch(isTouchDevice()) }, [])

    useEffect(() => {
        if (isTouch) return
        const handleMove = (e) => {
            const nx = e.clientX
            const ny = e.clientY

            if (cursorRef.current) {
                cursorRef.current.style.transform = `translate3d(${nx - 4}px, ${ny - 4}px, 0)`
                cursorRef.current.style.opacity = '1'
            }

            const last = lastPosRef.current
            if (last) {
                const interp = interpolate(last, { x: nx, y: ny }, 3)
                interp.forEach(p => trailRef.current.push(p))
            }
            trailRef.current.push({ x: nx, y: ny, life: 1 })

            if (trailRef.current.length > MAX_TRAIL * 3) {
                trailRef.current = trailRef.current.slice(-MAX_TRAIL * 2)
            }
            lastPosRef.current = { x: nx, y: ny }
        }
        const handleLeave = () => {
            if (cursorRef.current) cursorRef.current.style.opacity = '0'
        }
        const handleEnter = () => {
            if (cursorRef.current) cursorRef.current.style.opacity = '1'
        }

        window.addEventListener('mousemove', handleMove)
        document.addEventListener('mouseleave', handleLeave)
        document.addEventListener('mouseenter', handleEnter)
        return () => {
            window.removeEventListener('mousemove', handleMove)
            document.removeEventListener('mouseleave', handleLeave)
            document.removeEventListener('mouseenter', handleEnter)
        }
    }, [isTouch])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        let last = performance.now()
        const loop = (now) => {
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            trailRef.current.forEach(p => { p.life -= TRAIL_DECAY * dt })
            trailRef.current = trailRef.current.filter(p => p.life > 0.01)

            const trail = trailRef.current
            if (trail.length >= 2) {
                const distances = [0]
                for (let i = trail.length - 2; i >= 0; i--) {
                    const a = trail[i + 1]
                    const b = trail[i]
                    const dx = b.x - a.x
                    const dy = b.y - a.y
                    distances.unshift(distances[0] + Math.sqrt(dx * dx + dy * dy))
                }
                const totalLen = distances[0]

                for (let i = 0; i < trail.length - 1; i++) {
                    const p0 = trail[i]
                    const p1 = trail[i + 1]
                    const distFromTip = totalLen - distances[i]
                    if (distFromTip > TRAIL_MAX_LEN) continue

                    const taper = 1 - (distFromTip / TRAIL_MAX_LEN)
                    const width = taper * 2.5 + 0.3
                    const alpha = taper * Math.min(p0.life, p1.life) * 0.5
                    if (alpha < 0.005) continue

                    ctx.save()
                    ctx.globalAlpha = alpha
                    ctx.shadowColor = `rgba(0, 212, 255, ${alpha * 0.5})`
                    ctx.shadowBlur = 8 + taper * 4
                    ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`
                    ctx.lineWidth = width + 1
                    ctx.lineCap = 'round'
                    ctx.beginPath()
                    ctx.moveTo(p0.x, p0.y)
                    ctx.lineTo(p1.x, p1.y)
                    ctx.stroke()

                    // Inner core
                    ctx.shadowBlur = 3
                    ctx.shadowColor = `rgba(200, 240, 255, ${alpha * 0.4})`
                    ctx.strokeStyle = `rgba(200, 240, 255, ${alpha * 0.7})`
                    ctx.lineWidth = width * 0.4
                    ctx.beginPath()
                    ctx.moveTo(p0.x, p0.y)
                    ctx.lineTo(p1.x, p1.y)
                    ctx.stroke()
                    ctx.restore()
                }
            }

            // Particles
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

            animRef.current = requestAnimationFrame(loop)
        }
        animRef.current = requestAnimationFrame(loop)
        return () => {
            cancelAnimationFrame(animRef.current)
            window.removeEventListener('resize', resize)
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
            projectBtn.dispatchEvent(new CustomEvent('laser-hit', {
                detail: { projectId: projectBtn.dataset.projectId },
                bubbles: true,
            }))
        }
    }, [])

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
            {/* Simple dot cursor */}
            <div
                ref={cursorRef}
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    pointerEvents: 'none',
                    zIndex: 99999,
                    opacity: 0,
                    willChange: 'transform',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#00d4ff',
                    boxShadow: '0 0 8px rgba(0, 212, 255, 0.5), 0 0 20px rgba(0, 212, 255, 0.2)',
                }}
            />
        </>
    )
}
